import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

// Gemini Vision API para analisar comprovante Pix
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

  // Download file as base64
  const imgResponse = await fetch(imageUrl);
  const imgBuffer = await imgResponse.arrayBuffer();
  const base64 = Buffer.from(imgBuffer).toString("base64");

  // Determine mimeType — CDN URLs may not return correct content-type, so also check URL extension
  const urlLower = imageUrl.toLowerCase().split("?")[0];
  const isPdf = urlLower.endsWith(".pdf") || imgResponse.headers.get("content-type") === "application/pdf";
  const mimeType = isPdf
    ? "application/pdf"
    : urlLower.endsWith(".png")
    ? "image/png"
    : urlLower.endsWith(".webp")
    ? "image/webp"
    : "image/jpeg";

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

  // Candidate models to try in order of preference
  const configuredModel = process.env.GEMINI_MODEL;
  const candidateModels = configuredModel
    ? [configuredModel, "gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash-002", "gemini-1.5-flash-001", "gemini-1.5-flash"]
    : ["gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash-002", "gemini-1.5-flash-001", "gemini-1.5-flash"];

  if (!apiKey) {
    throw new Error("Chave da API Gemini não configurada (GEMINI_API_KEY).");
  }

  // Helper to call generateContent for a given model
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

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    return res;
  }

  // Try dynamic ListModels if needed
  let lastError: Error | null = null;
  let responseData: any = null;

  // First, try candidate models in order
  for (const model of candidateModels) {
    try {
      const res = await callGemini(model);
      if (res.ok) {
        responseData = await res.json();
        break;
      }
      const errText = await res.text();
      // If 404 model not found, try next candidate model
      if (res.status === 404) {
        lastError = new Error(`Model ${model} returned 404: ${errText}`);
        continue;
      }
      // For other errors (like 400, 401, 429), throw immediately
      throw new Error(`Erro na API Gemini (${res.status}): ${errText}`);
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes("404")) {
        continue;
      }
      throw err;
    }
  }

  // If candidate loop failed due to 404s, try fetching available models directly via ListModels API
  if (!responseData) {
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const availableModels: any[] = listData.models || [];
        // Find models supporting generateContent
        const validModels = availableModels
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => m.name);

        for (const modelPath of validModels) {
          const res = await callGemini(modelPath);
          if (res.ok) {
            responseData = await res.json();
            break;
          }
        }
      }
    } catch (e) {
      // Ignore list error and throw last error below
    }
  }

  if (!responseData) {
    throw lastError || new Error("Nenhum modelo Gemini compatível foi encontrado para sua chave API.");
  }

  const geminiData = responseData;
  const parts = geminiData?.candidates?.[0]?.content?.parts || [];
  const rawContent = parts.map((p: any) => p.text || "").join("\n").trim();

  // Clean codeblock formatting (```json ... ```)
  const cleanedText = rawContent
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: any = null;

  try {
    parsed = JSON.parse(cleanedText);
  } catch (e) {
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e2) {
        // Ignored
      }
    }
  }

  if (!parsed) {
    console.warn("⚠️ Gemini output could not be parsed as JSON. Raw output:", rawContent);
    return {
      recipientName: null,
      recipientCpfCnpj: null,
      recipientBank: null,
      payerName: null,
      payerCpfCnpj: null,
      transactionDate: null,
      debitDate: null,
      authCode: null,
      transactionValue: null,
      transactionType: "OUTRO",
      isCompleted: false,
      isScheduled: false,
      rawText: rawContent,
      confidence: "LOW",
    };
  }

  return parsed;
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
    const offerId = Number(body.offer_id);
    const imageUrl = String(body.image_url || "").trim();

    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json(
        { success: false, error: "offer_id inválido." },
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

    // Calculate required deposit amount for this reservation
    const depositPct = Number(offer.property?.depositPercentage || 20);
    const requiredDepositAmount = Number(
      offer.depositAmount || (Number(offer.offerPrice) * (depositPct / 100))
    );

    // Load existing receipt history from previousValidation
    const previousValidation = (offer.pixValidation as any) || null;
    let existingHistory: Array<{ url: string; amount: number; authCode?: string | null; date?: string | null }> = [];

    if (Array.isArray(previousValidation?.receiptHistory)) {
      existingHistory = previousValidation.receiptHistory.filter(
        (item: any) => item && typeof item.url === "string" && typeof item.amount === "number" && item.amount > 0
      );
    } else if (previousValidation?.checks?.depositValue?.accumulatedPaidAmount) {
      // Fallback for legacy records without receiptHistory
      if (offer.pixReceiptUrl) {
        existingHistory.push({
          url: offer.pixReceiptUrl,
          amount: Number(previousValidation.checks.depositValue.accumulatedPaidAmount),
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

    // Check authCode uniqueness across ALL offers in database (prevent receipt reuse)
    let isUniqueAuthCode = true;
    let authCodeReason = "";
    if (analysis.authCode && String(analysis.authCode).trim().length >= 6) {
      const cleanCode = String(analysis.authCode).trim();
      const existingDuplicate = await prisma.offer.findFirst({
        where: {
          id: { not: offerId },
          pixValidation: {
            path: ["checks", "authCode", "code"],
            equals: cleanCode,
          },
        },
      });
      if (existingDuplicate) {
        isUniqueAuthCode = false;
        authCodeReason = "Código de autenticação já utilizado em outra reserva";
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
      const existingIndex = updatedHistory.findIndex((item) => item.url === imageUrl);
      const newEntry = {
        url: imageUrl,
        amount: extractedAmount,
        authCode: analysis.authCode || null,
        date: analysis.transactionDate || analysis.debitDate || null,
      };
      if (existingIndex >= 0) {
        updatedHistory[existingIndex] = newEntry;
      } else {
        updatedHistory.push(newEntry);
      }
    }

    // Calculate total accumulated paid by summing all receipt amounts in history
    const totalAccumulatedPaid = Number(
      updatedHistory.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)
    );

    let isValueMatching = false;
    let remainingAmount: number | null = null;
    let isPartialPayment = false;

    if (totalAccumulatedPaid >= requiredDepositAmount - 0.05) {
      // Total accumulated meets or exceeds required deposit -> VALUE CHECK PASSED!
      isValueMatching = true;
      remainingAmount = 0;
      isPartialPayment = false;
    } else {
      // Total accumulated is smaller than required deposit -> PARTIAL PAYMENT
      remainingAmount = Number((requiredDepositAmount - totalAccumulatedPaid).toFixed(2));
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
        expected: requiredDepositAmount,
        remaining: remainingAmount,
        isPartial: isPartialPayment,
        label: isValueMatching
          ? updatedHistory.length > 1
            ? `Sinal Quitado (R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} acumulados via ${updatedHistory.length} comprovantes)`
            : `Valor do Sinal Pago (R$ ${extractedAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`
          : isPartialPayment
          ? `Sinal Parcial (Pago R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${requiredDepositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`
          : `Valor Incorreto (Esperado R$ ${requiredDepositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
      },
    };

    const allPassed = Object.values(checks).every((c) => c.passed);
    const passedCount = Object.values(checks).filter((c) => c.passed).length;

    // Collect all receipt URLs for this offer
    const newReceiptUrls = Array.from(
      new Set([
        ...updatedHistory.map((item) => item.url),
        ...(Array.isArray(previousValidation?.receiptUrls) ? previousValidation.receiptUrls : []),
        ...(offer.pixReceiptUrl ? [offer.pixReceiptUrl] : []),
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

    // Save validation & pixReceiptUrl to offer
    await prisma.offer.update({
      where: { id: offerId },
      data: {
        pixReceiptUrl: imageUrl,
        pixValidation: validation as any,
      },
    });

    // If ALL 6 checks passed strictly, advance to RESERVA_CONFIRMADA
    if (allPassed) {
      await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "RESERVA_CONFIRMADA",
        },
      });
    }

    let responseMessage = "";
    if (allPassed) {
      if (updatedHistory.length > 1) {
        responseMessage = `✅ Comprovante complementar validado! Com este pagamento de R$ ${extractedAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, o sinal de R$ ${requiredDepositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} foi totalmente quitado via ${updatedHistory.length} comprovantes (Total acumulado: R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Reserva confirmada com sucesso!`;
      } else {
        responseMessage = "✅ Comprovante validado com sucesso! Reserva confirmada.";
      }
    } else if (isPartialPayment && remainingAmount && passedCount === 4) {
      responseMessage = `⚠️ Pagamento parcial detectado! Você pagou R$ ${extractedAmount?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} neste comprovante (Total acumulado: R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} dos R$ ${requiredDepositAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} do sinal). Faça um Pix de R$ ${remainingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para complementar o valor restante e anexe o novo comprovante.`;
    } else {
      responseMessage = `⚠️ ${passedCount} de 5 verificações passaram. O anfitrião analisará manualmente.`;
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
