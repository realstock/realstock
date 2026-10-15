import { ParsedTransaction, parseOfx } from "./ofxParser";
import { parseCsv } from "./csvParser";
import { detectDocumentType, detectCompetence } from "./competenceDetector";

export interface ParsedTxtResult {
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
  accountName?: string;
  periodStart?: Date;
  periodEnd?: Date;
  competenceMonth?: number;
  competenceYear?: number;
  transactions: ParsedTransaction[];
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

function parseBrazilianDate(dateStr: string): Date | null {
  const clean = dateStr.trim().replace(/"/g, "");
  // Formato DD/MM/YYYY ou DD/MM/YY
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

/**
 * Tenta extrair transações de texto formatado em colunas (espaços ou tabulações).
 * Padrão comum em extratos de terminais bancários e faturas exportadas em TXT.
 */
function parseFixedOrRegexLines(
  text: string,
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD"
): ParsedTransaction[] {
  const lines = text.split(/\r?\n/);
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 10) continue;

    // Procura por data brasileira no início ou meio da linha: DD/MM/AAAA ou DD/MM/AA
    const dateMatch = cleanLine.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (!dateMatch) continue;

    const parsedDate = parseBrazilianDate(dateMatch[1]);
    if (!parsedDate) continue;

    // Procura por valor monetário no final da linha (ex: "150,00", "-45,90", "1.250,00 D", "500,00 C")
    const amountMatch = cleanLine.match(/([+\-]?\s*\d{1,3}(?:\.\d{3})*,\d{2})\s*([CDcd])?\s*$/);
    if (!amountMatch) continue;

    const rawAmountStr = amountMatch[1].replace(/\s+/g, "");
    const flagCD = (amountMatch[2] || "").toUpperCase();

    let amount = parseMoneyAmount(rawAmountStr);
    if (amount === null || amount === 0) continue;

    // Remove a data e o valor da linha para obter a descrição
    const descPart = cleanLine
      .replace(dateMatch[0], "")
      .replace(amountMatch[0], "")
      .replace(/[|;]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const description = descPart || "Lançamento Sem Descrição";

    let type: "INCOME" | "EXPENSE" = "EXPENSE";

    if (sourceType === "BANK_STATEMENT") {
      if (flagCD === "C" || amount > 0 || /pix\s*recebido|ted\s*recebida|deposito|salario|rendimento/i.test(description)) {
        type = "INCOME";
      } else {
        type = "EXPENSE";
      }
    } else {
      // Cartão de crédito:
      if (flagCD === "C" || /estorno|cr[ée]dito|desconto/i.test(description)) {
        type = "INCOME";
      } else {
        type = "EXPENSE";
      }
    }

    const installmentMatch = description.match(/\b(\d{1,2}\/\d{1,2})\b/);
    const installment = installmentMatch ? installmentMatch[1] : undefined;

    transactions.push({
      date: parsedDate,
      amount: Math.abs(amount),
      type,
      description,
      rawText: cleanLine,
      installment,
      sourceType,
    });
  }

  return transactions;
}

/**
 * Fallback via IA (Gemini Flash) para textos não estruturados ou formatos proprietários de bancos.
 */
async function parseTextWithAI(
  text: string,
  filename: string,
  detectedSourceType: "BANK_STATEMENT" | "CREDIT_CARD"
): Promise<{
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
  accountName?: string;
  competenceMonth?: number;
  competenceYear?: number;
  transactions: ParsedTransaction[];
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    return {
      sourceType: detectedSourceType,
      transactions: [],
    };
  }

  const prompt = `Você é um extrator especialista de dados bancários e faturas de cartão brasileiras (Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Inter, C6, XP, Caixa, etc.).
Analise o texto deste extrato/fatura (${filename}) e extraia TODOS os lançamentos financeiros individuais.

Diretrizes:
1. Identifique se o documento é:
   - "CREDIT_CARD" (Fatura de Cartão de Crédito)
   - "BANK_STATEMENT" (Extrato de Conta Corrente / Poupança)
2. Identifique o mês e ano de competência/vencimento (ex: mês 1, ano 2026).
3. Para cada lançamento:
   - "date": Data no formato ISO "YYYY-MM-DD"
   - "description": Nome limpo e claro do favorecido ou estabelecimento
   - "amount": Valor numérico positivo (ex: 45.90)
   - "type": "EXPENSE" (compras, débitos) ou "INCOME" (receitas, depósitos, estornos)
   - "installment": Parcela se houver (ex: "01/10") ou null

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "sourceType": "CREDIT_CARD" | "BANK_STATEMENT",
  "accountName": "Nome do Banco ou Cartão",
  "competenceMonth": 1,
  "competenceYear": 2026,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Nome do Estabelecimento",
      "amount": 45.90,
      "type": "EXPENSE",
      "installment": null
    }
  ]
}

Texto a ser analisado:
"""
${text.substring(0, 50000)}
"""`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    }
  );

  if (!res.ok) {
    return { sourceType: detectedSourceType, transactions: [] };
  }

  const json = await res.json();
  const rawJson = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawJson) return { sourceType: detectedSourceType, transactions: [] };

  const parsed = JSON.parse(rawJson);
  const finalType = parsed.sourceType === "CREDIT_CARD" ? "CREDIT_CARD" : "BANK_STATEMENT";

  const transactions: ParsedTransaction[] = [];
  if (Array.isArray(parsed.transactions)) {
    parsed.transactions.forEach((tx: any) => {
      const numAmt = parseFloat(tx.amount);
      if (isNaN(numAmt) || numAmt <= 0) return;
      const dateObj = tx.date ? new Date(tx.date + "T12:00:00Z") : new Date();

      transactions.push({
        date: isNaN(dateObj.getTime()) ? new Date() : dateObj,
        amount: Number(numAmt.toFixed(2)),
        type: tx.type === "INCOME" ? "INCOME" : "EXPENSE",
        description: String(tx.description || "Lançamento").trim(),
        rawText: `${tx.date} - ${tx.description} - R$ ${numAmt}`,
        installment: tx.installment || undefined,
        sourceType: finalType,
      });
    });
  }

  return {
    sourceType: finalType,
    accountName: parsed.accountName,
    competenceMonth: parsed.competenceMonth,
    competenceYear: parsed.competenceYear,
    transactions,
  };
}

/**
 * Parser principal para arquivos .TXT
 */
export async function parseTxt(
  txtContent: string,
  filename: string
): Promise<ParsedTxtResult> {
  const contentPreview = txtContent.substring(0, 8000);

  // 1. Caso o .TXT seja na verdade um arquivo OFX renomeado
  if (
    txtContent.includes("<OFX>") ||
    txtContent.includes("<STMTTRN>") ||
    txtContent.includes("<CREDITCARDMSGSRSV1>") ||
    txtContent.includes("<BANKTRANLIST>")
  ) {
    const ofxRes = parseOfx(txtContent);
    return {
      sourceType: ofxRes.sourceType,
      accountName: ofxRes.bankId ? `Banco (${ofxRes.bankId})` : undefined,
      periodStart: ofxRes.periodStart,
      periodEnd: ofxRes.periodEnd,
      transactions: ofxRes.transactions,
    };
  }

  // 2. Identifica tipo e competência
  const docTypeRes = detectDocumentType(filename, contentPreview);
  const compRes = detectCompetence(filename, null, null, null, contentPreview);

  // 3. Tenta processar como CSV/TSV delimitado
  const csvRes = parseCsv(txtContent);
  if (csvRes.transactions.length > 0) {
    return {
      sourceType: docTypeRes.sourceType,
      accountName: csvRes.accountName,
      competenceMonth: compRes.month,
      competenceYear: compRes.year,
      transactions: csvRes.transactions,
    };
  }

  // 4. Tenta processar como linhas tabuladas / regex estruturado
  const regexTxs = parseFixedOrRegexLines(txtContent, docTypeRes.sourceType);
  if (regexTxs.length > 0) {
    return {
      sourceType: docTypeRes.sourceType,
      competenceMonth: compRes.month,
      competenceYear: compRes.year,
      transactions: regexTxs,
    };
  }

  // 5. Fallback com IA (Gemini Flash)
  try {
    const aiRes = await parseTextWithAI(txtContent, filename, docTypeRes.sourceType);
    if (aiRes.transactions.length > 0) {
      return {
        sourceType: aiRes.sourceType,
        accountName: aiRes.accountName,
        competenceMonth: aiRes.competenceMonth || compRes.month,
        competenceYear: aiRes.competenceYear || compRes.year,
        transactions: aiRes.transactions,
      };
    }
  } catch (err) {
    console.error("AI Text Parser fallback error:", err);
  }

  return {
    sourceType: docTypeRes.sourceType,
    competenceMonth: compRes.month,
    competenceYear: compRes.year,
    transactions: [],
  };
}
