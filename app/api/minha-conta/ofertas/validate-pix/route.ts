import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  "transactionDate": "Data e hora exata da transação (ex: 12/08/2025 14:32:05)",
  "debitDate": "Data do débito se diferente da transação",
  "authCode": "Código de autenticação / hash / ID da transação ou E2E ID",
  "transactionValue": "Valor transferido em reais",
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

  let geminiUrl = "";
  let requestBody: any = {};

  if (apiKey) {
    // Google AI Studio API (gratuita)
    geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    requestBody = {
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
      },
    };
  } else {
    throw new Error("Chave da API Gemini não configurada (GEMINI_API_KEY).");
  }

  const geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    throw new Error(`Erro na API Gemini: ${geminiRes.status} - ${errText}`);
  }

  const geminiData = await geminiRes.json();
  const rawContent =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parse JSON from response
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Resposta da IA não contém JSON válido.");
  }

  const parsed = JSON.parse(jsonMatch[0]);
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

    // Verify ownership
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

    // Build validation result object
    const checks = {
      recipientData: {
        passed: !!(
          analysis.recipientName &&
          (analysis.recipientCpfCnpj || analysis.recipientBank)
        ),
        name: analysis.recipientName,
        cpfCnpj: analysis.recipientCpfCnpj,
        bank: analysis.recipientBank,
        label: "Dados do Destinatário",
      },
      payerData: {
        passed: !!(analysis.payerName && analysis.payerCpfCnpj),
        name: analysis.payerName,
        cpfCnpj: analysis.payerCpfCnpj,
        label: "Dados do Pagador",
      },
      transactionDateTime: {
        passed: !!(analysis.transactionDate),
        date: analysis.transactionDate,
        debitDate: analysis.debitDate,
        label: "Data e Hora da Operação",
      },
      authCode: {
        passed: !!(analysis.authCode),
        code: analysis.authCode,
        label: "Código de Autenticação",
      },
      isEffective: {
        passed: analysis.isCompleted === true && analysis.isScheduled !== true,
        transactionType: analysis.transactionType,
        label: "Tipo de Comprovante (Efetivado)",
      },
    };

    const allPassed = Object.values(checks).every((c) => c.passed);
    const passedCount = Object.values(checks).filter((c) => c.passed).length;

    const validation = {
      analyzedAt: new Date().toISOString(),
      confidence: analysis.confidence,
      allPassed,
      passedCount,
      totalChecks: 5,
      checks,
      transactionValue: (analysis as any).transactionValue || null,
      rawText: analysis.rawText,
    };

    // Save validation to offer
    await prisma.offer.update({
      where: { id: offerId },
      data: {
        pixValidation: validation as any,
      },
    });

    // If all passed, advance to phase 3 (RESERVA_CONFIRMADA)
    if (allPassed) {
      await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "RESERVA_CONFIRMADA",
        },
      });
    }

    return NextResponse.json({
      success: true,
      validation,
      allPassed,
      advanced: allPassed,
      message: allPassed
        ? "✅ Comprovante validado! Reserva confirmada."
        : `⚠️ ${passedCount} de 5 verificações passaram. O anfitrião irá analisar manualmente.`,
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
