import { ParsedTransaction } from "./ofxParser";

export interface ParsedCsvResult {
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
  accountName?: string;
  transactions: ParsedTransaction[];
}

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (tabs > semicolons && tabs > commas) return "\t";
  if (semicolons >= commas) return ";";
  return ",";
}

function parseBrazilianDate(dateStr: string): Date | null {
  const clean = dateStr.trim().replace(/"/g, "");
  // Formato DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10) - 1;
    let year = parseInt(brMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (!isNaN(d.getTime())) return d;
  }

  // Formato YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

function parseMoneyAmount(valStr: string): number | null {
  if (!valStr) return null;
  let clean = valStr.trim().replace(/"/g, "").replace(/R\$\s?/i, "").replace(/\s/g, "");
  if (!clean) return null;

  // Trata formato brasileiro: "1.250,50" -> "1250.50"
  if (clean.includes(",") && clean.includes(".")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    clean = clean.replace(",", ".");
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

export function parseCsv(csvContent: string): ParsedCsvResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { sourceType: "BANK_STATEMENT", transactions: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;
  let typeIdx = -1;

  headers.forEach((h, idx) => {
    if (/data|dt|date|dia/i.test(h) && dateIdx === -1) dateIdx = idx;
    else if (/descri|t[íi]tulo|memo|hist[óo]rico|estabelecimento|lan[çc]amento/i.test(h) && descIdx === -1) descIdx = idx;
    else if (/valor|amount|quantia|preco|pre[çc]o/i.test(h) && amountIdx === -1) amountIdx = idx;
    else if (/tipo|type|cr[ée]dito.*d[ée]bito/i.test(h) && typeIdx === -1) typeIdx = idx;
  });

  // Fallback se não encontrou cabeçalho explícito
  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    dateIdx = 0;
    descIdx = 1;
    amountIdx = 2;
  }

  // Detecta se é fatura de cartão de crédito baseado no cabeçalho ou nome
  const isCreditCard = headers.some((h) => /cart[ãa]o|card|fatura|parcela/i.test(h)) ||
    /fatura|cartao|credit_card|nubank_card/i.test(lines[0]);
  const sourceType = isCreditCard ? "CREDIT_CARD" : "BANK_STATEMENT";

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

    const parsedDate = parseBrazilianDate(cols[dateIdx]);
    if (!parsedDate) continue;

    const description = cols[descIdx] || "Lançamento Sem Descrição";
    const parsedAmount = parseMoneyAmount(cols[amountIdx]);
    if (parsedAmount === null || parsedAmount === 0) continue;

    let type: "INCOME" | "EXPENSE" = parsedAmount > 0 ? "INCOME" : "EXPENSE";

    if (sourceType === "CREDIT_CARD") {
      // Em cartões de crédito em CSV, compras geralmente vêm positivas e pagamentos negativas (ou vice-versa)
      if (/pagamento|estorno|cr[ée]dito/i.test(description) || parsedAmount < 0) {
        type = "INCOME";
      } else {
        type = "EXPENSE";
      }
    }

    const installmentMatch = description.match(/\b(\d{1,2}\/\d{1,2})\b/);
    const installment = installmentMatch ? installmentMatch[1] : undefined;

    transactions.push({
      date: parsedDate,
      amount: Math.abs(parsedAmount),
      type,
      description,
      rawText: rawLine,
      installment,
      sourceType,
    });
  }

  return {
    sourceType,
    transactions,
  };
}
