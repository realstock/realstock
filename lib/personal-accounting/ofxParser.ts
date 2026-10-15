/**
 * Parser de arquivos OFX (Open Financial Exchange)
 * Compatível com bancos brasileiros (Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Inter, C6, XP, etc.)
 * Suporta formatos SGML (sem fechamento de tags) e XML.
 */

export interface ParsedTransaction {
  date: Date;
  amount: number; // Positivo para receitas/créditos, positivo absoluto em compras de cartão, com flag type
  type: "INCOME" | "EXPENSE";
  description: string;
  rawText: string;
  fitid?: string;
  installment?: string; // ex: "01/10"
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
}

export interface ParsedOfxResult {
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
  accountName?: string;
  bankId?: string;
  acctId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  transactions: ParsedTransaction[];
}

function parseOfxDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();
  const clean = dateStr.trim();
  // Formato típico: YYYYMMDDHHMMSS ou YYYYMMDD
  const year = parseInt(clean.substring(0, 4), 10);
  const month = parseInt(clean.substring(4, 6), 10) - 1;
  const day = parseInt(clean.substring(6, 8), 10);

  let hours = 12;
  let minutes = 0;
  let seconds = 0;

  if (clean.length >= 12) {
    hours = parseInt(clean.substring(8, 10), 10) || 12;
    minutes = parseInt(clean.substring(10, 12), 10) || 0;
  }
  if (clean.length >= 14) {
    seconds = parseInt(clean.substring(12, 14), 10) || 0;
  }

  const d = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  return isNaN(d.getTime()) ? new Date() : d;
}

function extractTagValue(block: string, tag: string): string | null {
  // Tenta formato XML com tag de fechamento <TAG>valor</TAG>
  const xmlRegex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i");
  const xmlMatch = block.match(xmlRegex);
  if (xmlMatch && xmlMatch[1] !== undefined) {
    return xmlMatch[1].trim();
  }

  // Tenta formato SGML <TAG>valor (termina na próxima tag '<' ou quebra de linha)
  const sgmlRegex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
  const sgmlMatch = block.match(sgmlRegex);
  if (sgmlMatch && sgmlMatch[1] !== undefined) {
    return sgmlMatch[1].trim();
  }

  return null;
}

function extractInstallment(text: string, sourceType: "BANK_STATEMENT" | "CREDIT_CARD"): string | undefined {
  if (sourceType === "BANK_STATEMENT") {
    // Extratos bancários contêm datas como "01/03 08:37" ou "02/03/2026", que NÃO são parcelas
    const match = text.match(/\b(?:parc(?:ela)?|prest)\.?\s*(\d{1,2}\/\d{1,2})\b/i);
    return match ? match[1] : undefined;
  }
  // No cartão de crédito, busca parcelas como "01/10", "PARC 02/05" (evitando datas como 01/03/2026)
  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) {
    const withoutDates = text.replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "");
    const match = withoutDates.match(/\b(\d{1,2}\/(?:0[2-9]|[1-5]\d))\b/);
    return match ? match[1] : undefined;
  }
  const match = text.match(/\b(\d{1,2}\/(?:0[2-9]|[1-5]\d))\b/);
  return match ? match[1] : undefined;
}

export function parseOfx(ofxContent: string): ParsedOfxResult {
  const isCreditCard = /<CREDITCARDMSGSRSV1>|<CCSTMTTRNRS>|<CCSTMTRS>/i.test(ofxContent);
  const sourceType: "BANK_STATEMENT" | "CREDIT_CARD" = isCreditCard ? "CREDIT_CARD" : "BANK_STATEMENT";

  const bankId = extractTagValue(ofxContent, "BANKID") || undefined;
  const acctId = extractTagValue(ofxContent, "ACCTID") || undefined;
  const dtStartStr = extractTagValue(ofxContent, "DTSTART");
  const dtEndStr = extractTagValue(ofxContent, "DTEND");

  const periodStart = dtStartStr ? parseOfxDate(dtStartStr) : undefined;
  const periodEnd = dtEndStr ? parseOfxDate(dtEndStr) : undefined;

  const transactions: ParsedTransaction[] = [];

  // Encontra todos os blocos <STMTTRN>
  // Pode terminar em </STMTTRN> ou no início de outro <STMTTRN> ou no fim de </BANKTRANLIST>
  const parts = ofxContent.split(/<STMTTRN>/i);

  // Primeira parte é o cabeçalho antes do primeiro STMTTRN
  for (let i = 1; i < parts.length; i++) {
    const rawBlock = parts[i];
    // Pega até </STMTTRN> ou próxima tag de fechamento
    const blockEnd = rawBlock.search(/<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTRS>/i);
    const block = blockEnd >= 0 ? rawBlock.substring(0, blockEnd) : rawBlock;

    const trnType = (extractTagValue(block, "TRNTYPE") || "").toUpperCase();
    const dtPostedStr = extractTagValue(block, "DTPOSTED");
    const trnAmtStr = extractTagValue(block, "TRNAMT") || "0";
    const fitid = extractTagValue(block, "FITID") || undefined;
    const memo = extractTagValue(block, "MEMO") || "";
    const name = extractTagValue(block, "NAME") || "";

    const rawDescription = (memo || name || "Lançamento Sem Nome").trim();
    // Limpa caracteres especiais e múltiplos espaços
    const cleanDescription = rawDescription.replace(/\s+/g, " ");

    const numAmt = parseFloat(trnAmtStr.replace(",", "."));
    if (isNaN(numAmt) || numAmt === 0) continue;

    // Em extratos bancários: valor negativo = débito/saída, valor positivo = crédito/entrada
    // Em cartões de crédito OFX:
    // Geralmente compras vêm com valor negativo (ex: -35.00) ou positivo dependendo do banco
    let type: "INCOME" | "EXPENSE" = "EXPENSE";
    let finalAmount = Math.abs(numAmt);

    if (sourceType === "BANK_STATEMENT") {
      if (numAmt > 0 || trnType === "CREDIT") {
        type = "INCOME";
      } else {
        type = "EXPENSE";
      }
    } else {
      // Cartão de crédito:
      const isCardPayment =
        (numAmt > 0 || trnType === "CREDIT") &&
        /PGTO\.?\s*CASH|PGTO\s*DEBITO|PAGAMENTO\s*FATURA|PAGTO\s*FATURA|PAGTO\s*POR\s*DEB|PAGAMENTO\s*DEB|PGTO\s*CONTA|PAGAMENTO\s*CONTA|PGTO\s*EFETUADO/i.test(
          cleanDescription
        );
      if (isCardPayment) {
        // Pagamento da fatura anterior dentro do extrato do cartão não é receita pessoal; ignora
        continue;
      }

      // Estornos e descontos de tarifa/anuidade são créditos
      if (trnType === "CREDIT" || (numAmt > 0 && /ESTORNO|CREDITO|DESC\b/i.test(cleanDescription))) {
        type = "INCOME";
      } else {
        type = "EXPENSE";
      }
    }

    const txDate = parseOfxDate(dtPostedStr);
    const installment = extractInstallment(cleanDescription, sourceType);

    transactions.push({
      date: txDate,
      amount: finalAmount,
      type,
      description: cleanDescription,
      rawText: rawDescription,
      fitid,
      installment,
      sourceType,
    });
  }

  return {
    sourceType,
    bankId,
    acctId,
    periodStart,
    periodEnd,
    transactions,
  };
}
