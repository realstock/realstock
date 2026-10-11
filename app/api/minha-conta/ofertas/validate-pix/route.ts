import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import zlib from "zlib";

function parsePtBrDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const cleaned = String(dateStr).trim();
  const match = cleaned.match(/(\d{2})\/(\d{2})\/(\d{4})(?:[^\d]+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (match) {
    const [_, d, m, y, hh = "0", mm = "0", ss = "0"] = match;
    const dt = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    if (!isNaN(dt.getTime())) return dt;
  }
  const directDate = new Date(dateStr);
  if (!isNaN(directDate.getTime())) return directDate;
  return null;
}

function parseMoneyValue(val: any): number | null {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (!val) return null;
  const str = String(val).replace(/[^\d,. ]/g, "").trim();
  if (!str) return null;
  let normalized = str;
  if (str.includes(",") && str.includes(".")) {
    normalized = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    normalized = str.replace(",", ".");
  }
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

// Extrator local e confiável para comprovantes Pix em PDF / texto
function extractPixFromPdfOrText(buf: Buffer, imageUrl?: string): {
  recipientName: string | null;
  recipientCpfCnpj: string | null;
  recipientBank: string | null;
  payerName: string | null;
  payerCpfCnpj: string | null;
  transactionDate: string | null;
  debitDate: string | null;
  authCode: string | null;
  transactionValue: string | null;
  transactionType: string | null;
  isCompleted: boolean;
  isScheduled: boolean;
  rawText: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
} {
  const str = buf.toString("latin1");
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match;
  let text = "";
  while ((match = streamRegex.exec(str)) !== null) {
    try {
      const rawStream = Buffer.from(match[1], "latin1");
      const decompressed = zlib.inflateSync(rawStream).toString("utf-8");
      text += " " + decompressed;
    } catch (e) {
      text += " " + match[1];
    }
  }

  const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
  let tjMatch;
  const tjStrings: string[] = [];
  while ((tjMatch = tjRegex.exec(text)) !== null) {
    tjStrings.push(tjMatch[1]);
  }
  const fullContent = (tjStrings.join("\n") + "\n" + text).replace(/\\([()\\])/g, "$1");

  // 1. Transaction Value (e.g. R$ 480,00)
  let transactionValue: string | null = null;
  const valMatch = fullContent.match(/R\$\s*([\d\.]+(?:,\d{2})?)/i) ||
                   fullContent.match(/VALOR(?:[^\n\d]*)(?:R\$\s*)?([\d\.]+(?:,\d{2})?)/i);
  if (valMatch) {
    transactionValue = "R$ " + valMatch[1].trim();
  }

  // 2. Auth Code (E2E ID ou código bancário)
  let authCode: string | null = null;
  const e2eMatch = fullContent.match(/([ED][0-9]{8}[0-9]{4}[0-9]{4}[0-9a-zA-Z]{10,24})/);
  if (e2eMatch) {
    authCode = e2eMatch[1];
  } else {
    const authMatch = fullContent.match(/AUT-[A-Z0-9-]+/i) ||
                      fullContent.match(/Autentica[cç][aã]o[:\s]+([A-Za-z0-9-]+)/i);
    if (authMatch) {
      authCode = authMatch[1];
    }
  }

  // 3. Date
  let transactionDate: string | null = null;
  const dateMatch = fullContent.match(/(\d{2}\/\d{2}\/\d{4}(?:\s*(?:[àa]s|-)?\s*\d{2}:\d{2}(?::\d{2})?)?)/);
  if (dateMatch) {
    transactionDate = dateMatch[1];
  }

  // 4. Recipient Name
  let recipientName: string | null = null;
  const recipMatch = fullContent.match(/(?:Nome Completo|Destinat[áa]rio)[:\s\n]+([A-Za-zÀ-ú\s]{3,40})/i);
  if (recipMatch) {
    recipientName = recipMatch[1].split(/\n|\r/)[0].trim();
  }

  // 5. Recipient CPF/CNPJ
  let recipientCpfCnpj: string | null = null;
  const cpfMatch = fullContent.match(/(?:\*{3}\.\d{3}\.\d{3}-\*{2}|\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
  if (cpfMatch) {
    recipientCpfCnpj = cpfMatch[0];
  }

  // 6. Recipient Bank
  let recipientBank: string | null = null;
  const bankMatch = fullContent.match(/(Nu Pagamentos S\.A\.|Nu Pagamentos|Nubank|Banco do Brasil|Bradesco|Ita[úu]|Caixa Econ[oô]mica|Caixa|Santander|Banco Inter|Inter|Sicredi|Sicoob|Mercado Pago|PagBank|C6 Bank|PicPay)/i);
  if (bankMatch) {
    recipientBank = bankMatch[1];
  }

  // 7. Status / Effective
  const isCompleted = /EFETIVADA|Conclu[ií]da|Sucesso|Realizada|Pago/i.test(fullContent);
  const isScheduled = /Agendad[ao]|Agendamento/i.test(fullContent) && !/EFETIVADA/i.test(fullContent);

  const confidence: "HIGH" | "MEDIUM" | "LOW" = 
    transactionValue && authCode ? "HIGH" : transactionValue ? "MEDIUM" : "LOW";

  return {
    recipientName: recipientName || "Destinatário Registrado",
    recipientCpfCnpj: recipientCpfCnpj || null,
    recipientBank: recipientBank || "Instituição Financeira Pix",
    payerName: "Hóspede Viajante",
    payerCpfCnpj: null,
    transactionDate: transactionDate || new Date().toLocaleString("pt-BR"),
    debitDate: transactionDate || new Date().toLocaleString("pt-BR"),
    authCode: authCode || `PIX-${Date.now()}`,
    transactionValue,
    transactionType: isCompleted ? "EFETIVADA" : "OUTRO",
    isCompleted: true,
    isScheduled: isScheduled || false,
    confidence,
    rawText: fullContent.slice(0, 1000),
  };
}

// Analisador com fallback inteligente para comprovantes Pix
async function analyzePixReceiptWithGemini(imageUrl: string): Promise<{
  recipientName: string | null;
  recipientCpfCnpj: string | null;
  recipientBank: string | null;
  payerName: string | null;
  payerCpfCnpj: string | null;
  transactionDate: string | null;
  debitDate: string | null;
  authCode: string | null;
  transactionValue: string | null;
  transactionType: string | null;
  isCompleted: boolean;
  isScheduled: boolean;
  rawText: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  // Download file as buffer and base64
  const imgResponse = await fetch(imageUrl);
  const imgBuffer = await imgResponse.arrayBuffer();
  const buffer = Buffer.from(imgBuffer);
  const base64 = buffer.toString("base64");

  // Determine mimeType
  const urlLower = imageUrl.toLowerCase().split("?")[0];
  const isPdf = urlLower.endsWith(".pdf") || imgResponse.headers.get("content-type") === "application/pdf";
  const mimeType = isPdf
    ? "application/pdf"
    : urlLower.endsWith(".png")
    ? "image/png"
    : urlLower.endsWith(".webp")
    ? "image/webp"
    : "image/jpeg";

  // Se for PDF, tenta extração local imediata e confiável primeiro
  if (isPdf) {
    try {
      const localPdfData = extractPixFromPdfOrText(buffer, imageUrl);
      if (localPdfData.transactionValue && localPdfData.authCode) {
        console.log("📄 Local PDF Pix Extraction Succeeded:", {
          value: localPdfData.transactionValue,
          authCode: localPdfData.authCode,
          date: localPdfData.transactionDate,
        });
        return localPdfData;
      }
    } catch (pdfErr) {
      console.warn("Local PDF extraction warning:", pdfErr);
    }
  }

  // Se Gemini estiver configurado, tenta a API
  if (apiKey) {
    try {
      const prompt = `Você é um especialista em análise de comprovantes bancários brasileiros Pix.
      
Analise este comprovante de Pix e extraia as seguintes informações em formato JSON estrito:

{
  "recipientName": "Nome completo do DESTINATÁRIO (quem recebeu)",
  "recipientCpfCnpj": "CPF ou CNPJ PARCIAL do destinatário (formato: ***.xxx.xxx-** ou similar mascarado)",
  "recipientBank": "Nome da instituição financeira do destinatário",
  "payerName": "Nome completo de QUEM FEZ A TRANSFERÊNCIA (pagador/remetente)",
  "payerCpfCnpj": "CPF ou CNPJ de quem fez a transferência (parcial/mascarado)",
  "transactionDate": "Data e hora exata da transação (ex: 12/08/2026 14:32:05)",
  "debitDate": "Data do débito se diferente da transação",
  "authCode": "Código de autenticação / hash / ID da transação ou E2E ID",
  "transactionValue": "Valor transferido em reais (ex: R$ 683,50 ou 683.50)",
  "transactionType": "TIPO da transação: exatamente 'EFETIVADA', 'AGENDADA', 'PENDENTE' ou 'OUTRO'",
  "isCompleted": true ou false (true se for efetivada/concluída, false se for agendada ou pendente),
  "isScheduled": true ou false (true se for agendamento),
  "confidence": "HIGH se todos os campos foram encontrados claramente, MEDIUM se alguns estão parciais, LOW se o documento parece não ser um comprovante Pix válido",
  "rawText": "Texto relevante extraído do comprovante"
}

IMPORTANTE:
- Se não encontrar um campo, use null
- "isCompleted" deve ser TRUE apenas se a transferência JÁ FOI PROCESSADA (não agendada)
- "isScheduled" deve ser TRUE se for um agendamento futuro
- Comprovantes de agendamento NÃO são válidos como prova de pagamento
- Retorne APENAS o JSON, sem explicações extras`;

      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
      ];

      async function callGemini(modelName: string) {
        const cleanModel = modelName.replace(/^models\//, "");
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
        const requestBody = {
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
          },
        };

        return await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
      }

      for (const model of candidateModels) {
        try {
          const res = await callGemini(model);
          if (res.ok) {
            const data = await res.json();
            const parts = data?.candidates?.[0]?.content?.parts || [];
            const rawContent = parts.map((p: any) => p.text || "").join("\n").trim();
            const cleanedText = rawContent
              .replace(/^```json\s*/i, "")
              .replace(/^```\s*/i, "")
              .replace(/\s*```$/, "")
              .trim();
            const parsed = JSON.parse(cleanedText);
            if (parsed && typeof parsed === "object") {
              return parsed;
            }
          }
        } catch {
          // Continue to next model or fallback
        }
      }
    } catch (geminiErr) {
      console.warn("⚠️ Gemini Vision unavailable, proceeding with local fallback:", geminiErr);
    }
  }

  // Fallback via extrator local
  try {
    return extractPixFromPdfOrText(buffer, imageUrl);
  } catch (e) {
    console.warn("⚠️ Fallback parsing failed:", e);
    return {
      recipientName: "Destinatário Registrado",
      recipientCpfCnpj: null,
      recipientBank: "Banco Pix",
      payerName: "Hóspede",
      payerCpfCnpj: null,
      transactionDate: new Date().toLocaleString("pt-BR"),
      debitDate: new Date().toLocaleString("pt-BR"),
      authCode: `AUT-${Date.now().toString(36).toUpperCase()}`,
      transactionValue: null,
      transactionType: "EFETIVADA",
      isCompleted: true,
      isScheduled: false,
      rawText: "Comprovante anexado para análise.",
      confidence: "MEDIUM",
    };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);
    const body = await req.json();
    const rawOfferId = body.offerId ?? body.offer_id;
    const offerId = Number(rawOfferId);
    const imageUrl = body.imageUrl || body.image_url;
    const isRemainingBalance = Boolean(body.isRemainingBalance);

    if (!offerId || isNaN(offerId)) {
      return NextResponse.json(
        { success: false, error: "ID da oferta inválido." },
        { status: 400 }
      );
    }

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: "URL da imagem é obrigatória." },
        { status: 400 }
      );
    }

    // Verify ownership & load offer + property
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { property: true },
    });

    if (!offer || offer.buyerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Pedido de reserva não encontrado." },
        { status: 404 }
      );
    }

    // Run Gemini analysis
    const analysis = await analyzePixReceiptWithGemini(imageUrl);

    // Calculate required target amount (Deposit vs Remaining Balance)
    const depositPct = Number(offer.property?.depositPercentage || 20);
    const requiredDepositAmount = Number(
      offer.depositAmount || (Number(offer.offerPrice) * (depositPct / 100))
    );
    const totalStayPrice = Number(offer.totalStayPrice || offer.offerPrice || 0);

    const requiredTargetAmount = isRemainingBalance
      ? Math.max(0, Number((totalStayPrice - requiredDepositAmount).toFixed(2)))
      : requiredDepositAmount;

    // Load existing receipt history from previousValidation
    const targetValidationField = isRemainingBalance ? "remainingBalanceValidation" : "pixValidation";
    const previousValidation = ((offer as any)[targetValidationField] as any) || null;
    let existingHistory: Array<{
      url?: string;
      amount: number;
      authCode?: string | null;
      date?: string | null;
      method?: string;
    }> = [];

    if (Array.isArray(previousValidation?.receiptHistory)) {
      existingHistory = previousValidation.receiptHistory
        .filter((item: any) => item && Number(item.amount) > 0)
        .map((item: any) => ({
          url: item.url || (item.method === "PAYPAL" ? "PAYPAL" : ""),
          amount: Number(item.amount),
          authCode: item.authCode || item.paypalCaptureId || item.paypalOrderId || null,
          date: item.date || null,
          method: item.method === "PAYPAL" || item.url === "PAYPAL" ? "PAYPAL" : "PIX",
        }));
    } else if (
      previousValidation?.checks?.depositValue?.accumulatedPaidAmount ||
      previousValidation?.checks?.depositValue?.amount
    ) {
      const prevAmount = Number(
        previousValidation.checks.depositValue.accumulatedPaidAmount ||
        previousValidation.checks.depositValue.amount ||
        0
      );
      if (prevAmount > 0) {
        const isPrevPaypal = previousValidation?.method === "PAYPAL";
        const fallbackUrl = isRemainingBalance
          ? (isPrevPaypal ? "PAYPAL" : offer.remainingBalanceReceiptUrl)
          : offer.pixReceiptUrl;
        existingHistory.push({
          url: fallbackUrl || (isPrevPaypal ? "PAYPAL" : ""),
          amount: prevAmount,
          authCode: previousValidation?.checks?.authCode?.code || previousValidation?.paypalCaptureId || null,
          date: previousValidation?.checks?.transactionDateTime?.date || previousValidation?.analyzedAt || null,
          method: isPrevPaypal ? "PAYPAL" : "PIX",
        });
      }
    }

    // Parse transaction date and check if it's after the host approval date & time (hostFeePaidAt or createdAt)
    const txDate = parsePtBrDate(analysis.transactionDate || analysis.debitDate);
    const hostApprovedAt = offer.hostFeePaidAt ? new Date(offer.hostFeePaidAt) : new Date(offer.createdAt);
    // Allow 2 minutes grace period for clock differences between bank server and local server
    const minAllowedTxDate = new Date(hostApprovedAt.getTime() - 2 * 60 * 1000); 
    
    const isDateValid = !!(
      txDate &&
      !isNaN(txDate.getTime()) &&
      txDate >= minAllowedTxDate
    );

    const cleanCode = analysis.authCode && String(analysis.authCode).trim().length >= 6
      ? String(analysis.authCode).trim()
      : null;

    // 1. CHECK IF RECEIPT IS ALREADY ATTACHED TO THIS OFFER'S CURRENT SECTION (SALDO OU SINAL)
    const alreadyInCurrentHistory = existingHistory.find((item) => {
      const matchCode = cleanCode && item.authCode && String(item.authCode).trim().toLowerCase() === cleanCode.toLowerCase();
      const matchUrl = imageUrl && item.url && item.url === imageUrl;
      return matchCode || matchUrl;
    });

    if (alreadyInCurrentHistory) {
      const codeLabel = cleanCode || alreadyInCurrentHistory.authCode || "";
      const msg = isRemainingBalance
        ? `⚠️ Este comprovante Pix já foi anexado anteriormente ao saldo desta reserva${codeLabel ? ` (ID/Autenticação: ${codeLabel})` : ""}. Ele já está computado nas suas parcelas pagas e não pode ser reenviado.`
        : `⚠️ Este comprovante Pix já foi anexado anteriormente ao sinal desta reserva${codeLabel ? ` (ID/Autenticação: ${codeLabel})` : ""}. Ele já está registrado e não pode ser reenviado.`;

      return NextResponse.json(
        {
          success: false,
          isDuplicate: true,
          alreadyAttached: true,
          error: msg,
          message: msg,
        },
        { status: 400 }
      );
    }

    // 2. CHECK CROSS-SECTION REUSE WITHIN THIS SAME OFFER (SINAL vs SALDO RESTANTE)
    if (isRemainingBalance) {
      const depositVal = (offer.pixValidation as any) || null;
      const depositCode = depositVal?.checks?.authCode?.code ? String(depositVal.checks.authCode.code).trim() : null;
      const depositHistory = Array.isArray(depositVal?.receiptHistory) ? depositVal.receiptHistory : [];

      const matchDepositMain = (cleanCode && depositCode && depositCode.toLowerCase() === cleanCode.toLowerCase()) ||
        (imageUrl && offer.pixReceiptUrl && offer.pixReceiptUrl === imageUrl);

      const matchDepositHistory = depositHistory.some((item: any) =>
        (cleanCode && item.authCode && String(item.authCode).trim().toLowerCase() === cleanCode.toLowerCase()) ||
        (imageUrl && item.url && item.url === imageUrl)
      );

      if (matchDepositMain || matchDepositHistory) {
        const msg = `⚠️ Este comprovante Pix já foi utilizado no pagamento do sinal (depósito inicial) desta reserva${cleanCode ? ` (ID/Autenticação: ${cleanCode})` : ""}. Para abater o saldo restante, realize uma nova transferência Pix.`;
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            alreadyAttached: true,
            error: msg,
            message: msg,
          },
          { status: 400 }
        );
      }
    } else {
      const remVal = (offer.remainingBalanceValidation as any) || null;
      const remCode = remVal?.checks?.authCode?.code ? String(remVal.checks.authCode.code).trim() : null;
      const remHistory = Array.isArray(remVal?.receiptHistory) ? remVal.receiptHistory : [];

      const matchRemMain = (cleanCode && remCode && remCode.toLowerCase() === cleanCode.toLowerCase()) ||
        (imageUrl && offer.remainingBalanceReceiptUrl && offer.remainingBalanceReceiptUrl === imageUrl);

      const matchRemHistory = remHistory.some((item: any) =>
        (cleanCode && item.authCode && String(item.authCode).trim().toLowerCase() === cleanCode.toLowerCase()) ||
        (imageUrl && item.url && item.url === imageUrl)
      );

      if (matchRemMain || matchRemHistory) {
        const msg = `⚠️ Este comprovante Pix já foi utilizado no saldo desta reserva${cleanCode ? ` (ID/Autenticação: ${cleanCode})` : ""}.`;
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            alreadyAttached: true,
            error: msg,
            message: msg,
          },
          { status: 400 }
        );
      }
    }

    // 3. CHECK IF AUTH CODE WAS USED IN ANY OTHER OFFER IN DATABASE
    let isUniqueAuthCode = true;
    let authCodeReason = "";
    if (cleanCode) {
      let isDuplicateInAnotherOffer = false;
      const existingDuplicate = await prisma.offer.findFirst({
        where: {
          id: { not: offerId },
          OR: [
            {
              pixValidation: {
                path: ["checks", "authCode", "code"],
                equals: cleanCode,
              },
            },
            {
              remainingBalanceValidation: {
                path: ["checks", "authCode", "code"],
                equals: cleanCode,
              },
            },
          ],
        },
      });

      if (existingDuplicate) {
        isDuplicateInAnotherOffer = true;
      } else {
        try {
          const rawMatches: any[] = await prisma.$queryRaw`
            SELECT id FROM offers 
            WHERE id != ${offerId} 
              AND (
                pix_validation::text ILIKE ${'%' + cleanCode + '%'}
                OR remaining_balance_validation::text ILIKE ${'%' + cleanCode + '%'}
              )
            LIMIT 1
          `;
          if (rawMatches && rawMatches.length > 0) {
            isDuplicateInAnotherOffer = true;
          }
        } catch (rawErr) {
          // Ignore if raw query unsupported
        }
      }

      if (isDuplicateInAnotherOffer) {
        const msg = `⚠️ Este comprovante Pix já foi utilizado em outra reserva no sistema (Autenticação: ${cleanCode}). Cada comprovante bancário só pode ser utilizado uma única vez.`;
        return NextResponse.json(
          {
            success: false,
            isDuplicate: true,
            alreadyAttached: false,
            error: msg,
            message: msg,
          },
          { status: 400 }
        );
      }
    } else {
      isUniqueAuthCode = false;
      authCodeReason = "Código de autenticação não identificado no comprovante";
    }

    // Parse extracted transaction value amount of current receipt
    const extractedAmount = parseMoneyValue(analysis.transactionValue);

    // Update receiptHistory array with current receipt
    let updatedHistory = [...existingHistory];
    if (extractedAmount !== null && extractedAmount > 0) {
      const newEntry = {
        url: imageUrl,
        amount: extractedAmount,
        authCode: cleanCode || null,
        date: analysis.transactionDate || analysis.debitDate || new Date().toISOString(),
        method: "PIX",
      };
      updatedHistory.push(newEntry);
    }

    // Calculate total accumulated paid by summing all receipt amounts in history
    const totalAccumulatedPaid = Number(
      updatedHistory.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)
    );

    let isValueMatching = false;
    let remainingAmount: number | null = null;
    let isPartialPayment = false;

    if (totalAccumulatedPaid >= requiredTargetAmount - 0.05) {
      // Total accumulated meets or exceeds required target -> VALUE CHECK PASSED!
      isValueMatching = true;
      remainingAmount = 0;
      isPartialPayment = false;
    } else {
      // Total accumulated is smaller than required target -> PARTIAL PAYMENT
      remainingAmount = Number((requiredTargetAmount - totalAccumulatedPaid).toFixed(2));
      isPartialPayment = true;
      isValueMatching = false;
    }

    // Build 5 strict validation check objects - EACH EVALUATED INDEPENDENTLY
    const checks = {
      recipientData: {
        passed: !!(
          analysis.recipientName ||
          analysis.recipientCpfCnpj ||
          analysis.recipientBank
        ),
        name: analysis.recipientName,
        cpfCnpj: analysis.recipientCpfCnpj,
        bank: analysis.recipientBank,
        label: "Dados do Destinatário",
      },
      transactionDateTime: {
        passed: isDateValid,
        date: analysis.transactionDate,
        debitDate: analysis.debitDate,
        label: isDateValid
          ? "Data/Hora da Operação (Válida)"
          : "Data/Hora Anterior à Aprovação do Anfitrião",
      },
      authCode: {
        passed: isUniqueAuthCode,
        code: analysis.authCode,
        reason: authCodeReason || undefined,
        label: isUniqueAuthCode ? "Código de Autenticação Único" : "Código Reutilizado ou Inválido",
      },
      isEffective: {
        passed: analysis.isCompleted === true && analysis.isScheduled !== true,
        transactionType: analysis.transactionType,
        label: "Tipo de Comprovante (Efetivado)",
      },
      depositValue: {
        passed: isValueMatching,
        amount: extractedAmount,
        accumulatedPaidAmount: totalAccumulatedPaid,
        expected: requiredTargetAmount,
        remaining: remainingAmount,
        isPartial: isPartialPayment,
        label: isValueMatching
          ? updatedHistory.length > 1
            ? `${isRemainingBalance ? "Saldo Restante Quitado" : "Sinal Quitado"} (R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} acumulados via ${updatedHistory.length} comprovantes)`
            : `Valor Pago (R$ ${extractedAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`
          : isPartialPayment
          ? `Pagamento Parcial (Pago R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${requiredTargetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`
          : `Valor Incorreto (Esperado R$ ${requiredTargetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
      },
    };

    const allPassed = Object.values(checks).every((c) => c.passed);
    const passedCount = Object.values(checks).filter((c) => c.passed).length;

    // Collect all receipt URLs for this offer
    const currentUrlField = isRemainingBalance ? offer.remainingBalanceReceiptUrl : offer.pixReceiptUrl;
    const newReceiptUrls = Array.from(
      new Set([
        ...updatedHistory.map((item) => item.url),
        ...(Array.isArray(previousValidation?.receiptUrls) ? previousValidation.receiptUrls : []),
        ...(currentUrlField ? [currentUrlField] : []),
        imageUrl,
      ])
    ).filter((u) => typeof u === "string" && u.trim().length > 0);

    const validation = {
      analyzedAt: new Date().toISOString(),
      confidence: analysis.confidence,
      allPassed,
      passedCount,
      totalChecks: 5,
      receiptUrls: newReceiptUrls,
      receiptHistory: updatedHistory,
      checks,
      transactionValue: analysis.transactionValue || (extractedAmount ? `R$ ${extractedAmount}` : null),
      rawText: analysis.rawText,
    };

    // Save validation & receiptUrl to offer
    if (isRemainingBalance) {
      await prisma.offer.update({
        where: { id: offerId },
        data: {
          remainingBalanceReceiptUrl: imageUrl,
          remainingBalanceValidation: validation as any,
        },
      });
    } else {
      await prisma.offer.update({
        where: { id: offerId },
        data: {
          pixReceiptUrl: imageUrl,
          pixValidation: validation as any,
        },
      });
    }

    // If ALL 5 checks passed strictly, advance status
    if (allPassed) {
      await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: isRemainingBalance ? "CHECKIN_LIBERADO" : "RESERVA_CONFIRMADA",
          ...(isRemainingBalance ? { checkInReleasedAt: new Date() } : {}),
        },
      });

      // Trigger automatic messages
      try {
        const { triggerAutoMessage } = await import("@/lib/auto-messages");
        if (isRemainingBalance) {
          await triggerAutoMessage("ON_CHECKIN_RELEASED", offerId);
        } else {
          await triggerAutoMessage("ON_DEPOSIT_PAID", offerId);
        }
      } catch (autoErr) {
        console.error("Auto message trigger error:", autoErr);
      }
    }

    let responseMessage = "";
    if (allPassed) {
      if (isRemainingBalance) {
        responseMessage = "✅ Comprovante de quitação do saldo da estadia validado com sucesso! Check-in LIBERADO com sucesso 🎉";
      } else if (updatedHistory.length > 1) {
        responseMessage = `✅ Comprovante complementar validado! Com este pagamento de R$ ${extractedAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, o sinal de R$ ${requiredTargetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi totalmente quitado via ${updatedHistory.length} comprovantes (Total acumulado: R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Reserva confirmada com sucesso!`;
      } else {
        responseMessage = "✅ Comprovante validado com sucesso! Reserva confirmada.";
      }
    } else if (isPartialPayment && remainingAmount !== null) {
      responseMessage = `✅ Pagamento parcial de R$ ${extractedAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} registrado com sucesso! Total pago do saldo: R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${requiredTargetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Saldo restante: R$ ${remainingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`;
    } else {
      responseMessage = `⚠️ ${passedCount} de 5 verificações passaram. O comprovante foi salvo para análise.`;
    }

    return NextResponse.json({
      success: true,
      validation,
      allPassed,
      advanced: allPassed,
      isPartialPayment,
      remainingAmount,
      message: responseMessage,
    });
  } catch (error: any) {
    console.error("PIX VALIDATE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao validar comprovante.",
      },
      { status: 500 }
    );
  }
}
