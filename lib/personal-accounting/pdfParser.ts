import { ParsedTransaction } from "./ofxParser";

export interface ParsedPdfResult {
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
  accountName?: string;
  competenceMonth?: number;
  competenceYear?: number;
  periodStart?: Date;
  periodEnd?: Date;
  transactions: ParsedTransaction[];
}

export async function parsePdfWithAI(pdfBuffer: Buffer, filename: string): Promise<ParsedPdfResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no servidor para leitura de PDFs.");
  }

  const base64Data = pdfBuffer.toString("base64");

  const prompt = `Você é um extrator de dados financeiros especialista em extratos bancários e faturas de cartão de crédito brasileiras (Nubank, Itaú, Bradesco, Santander, Banco do Brasil, Inter, C6, XP, Caixa, etc.).

Analise o documento PDF em anexo (${filename}) e extraia TODOS os lançamentos financeiros individuais.

Diretrizes:
1. Identifique se o documento é:
   - "CREDIT_CARD" (Fatura de Cartão de Crédito)
   - "BANK_STATEMENT" (Extrato de Conta Corrente / Poupança)
2. Identifique o nome da instituição ou cartão (ex: "Nubank", "Itaú", "XP Visa Infinite", etc.).
3. Identifique o mês e o ano de competência/vencimento do documento (ex: se for fatura que vence em Fevereiro/2026, competenceMonth = 2, competenceYear = 2026; se for extrato de Janeiro/2026, competenceMonth = 1, competenceYear = 2026).
4. Para cada lançamento financeiro, extraia:
   - "date": Data no formato ISO "YYYY-MM-DD"
   - "description": Nome limpo e claro do estabelecimento ou favorecido (ex: "iFood", "Uber", "Restaurante Silva", "Pão de Açúcar")
   - "amount": Valor numérico positivo (ex: 45.90, 120.00)
   - "type": "EXPENSE" para compras, saques, débitos, tarifas; "INCOME" para créditos, pagamentos de fatura recebidos, salários, pix recebido, estornos.
   - "installment": Parcela se houver no texto (ex: "01/10", "03/12") ou null se for à vista.
5. Ignore totais, cabeçalhos, avisos ou resumos de saldo anterior. Extraia apenas as transações individuais.

Responda ESTRITAMENTE em formato JSON com o seguinte schema:
{
  "sourceType": "CREDIT_CARD" | "BANK_STATEMENT",
  "accountName": "Nome do Banco ou Cartão",
  "competenceMonth": 1,
  "competenceYear": 2026,
  "periodStart": "YYYY-MM-DD" ou null,
  "periodEnd": "YYYY-MM-DD" ou null,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "Texto do Estabelecimento",
      "amount": 45.90,
      "type": "EXPENSE",
      "installment": "01/05" ou null
    }
  ]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Falha na IA ao analisar PDF: ${errorText.substring(0, 120)}`);
  }

  const json = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("A IA não retornou dados legíveis do documento PDF.");
  }

  const parsed = JSON.parse(rawText);
  const sourceType = parsed.sourceType === "CREDIT_CARD" ? "CREDIT_CARD" : "BANK_STATEMENT";

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
        sourceType,
      });
    });
  }

  return {
    sourceType,
    accountName: parsed.accountName || (sourceType === "CREDIT_CARD" ? "Cartão de Crédito" : "Conta Bancária"),
    competenceMonth: typeof parsed.competenceMonth === "number" ? parsed.competenceMonth : undefined,
    competenceYear: typeof parsed.competenceYear === "number" ? parsed.competenceYear : undefined,
    periodStart: parsed.periodStart ? new Date(parsed.periodStart + "T12:00:00Z") : undefined,
    periodEnd: parsed.periodEnd ? new Date(parsed.periodEnd + "T12:00:00Z") : undefined,
    transactions,
  };
}
