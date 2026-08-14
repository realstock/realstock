import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .toLowerCase();
}

function cleanCpf(val: string | null | undefined): string | null {
  if (!val) return null;
  const digits = val.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return val.trim();
}

async function analyzeIdentityDocumentWithGemini(
  fileBuffer: Buffer,
  mimeType: string
): Promise<{
  extractedName: string | null;
  extractedCpf: string | null;
  documentType: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.warn("Chave GEMINI_API_KEY não configurada para análise de OCR do documento.");
    return { extractedName: null, extractedCpf: null, documentType: null, confidence: "LOW" };
  }

  const base64 = fileBuffer.toString("base64");

  const prompt = `Você é um leitor especialista em documentos de identidade brasileiros (RG, CNH, Passaporte, DNI, Carteira Profissional ou CPF).
Analise o documento PDF ou imagem fornecido e extraia com a maior precisão possível o NOME COMPLETO DO TITULAR e o CPF DO TITULAR.

Retorne estritamente o seguinte JSON:
{
  "extractedName": "NOME COMPLETO DO TITULAR (sem abreviações, em maiúsculas)",
  "extractedCpf": "CPF DO TITULAR (ex: 123.456.789-00 ou 12345678900)",
  "documentType": "TIPO DO DOCUMENTO (RG, CNH, Passaporte, CPF, Outro)",
  "confidence": "HIGH" (se nome e CPF forem encontrados com clareza), "MEDIUM" (se apenas um foi encontrado), ou "LOW"
}

REGRAS:
- Se não encontrar um campo, use null.
- "extractedName" deve conter o nome civil completo do titular.
- "extractedCpf" deve conter o CPF numérico do titular.
- Retorne APENAS o JSON válido, sem markdown extra.`;

  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  for (const modelName of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: base64 } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      if (!res.ok) continue;

      const data = await res.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (textOutput) {
        const cleanedText = textOutput.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        return {
          extractedName: parsed.extractedName ? String(parsed.extractedName).trim().toUpperCase() : null,
          extractedCpf: parsed.extractedCpf ? cleanCpf(String(parsed.extractedCpf)) : null,
          documentType: parsed.documentType || null,
          confidence: parsed.confidence || "MEDIUM",
        };
      }
    } catch (err) {
      console.warn(`Tentativa com modelo ${modelName} falhou:`, err);
    }
  }

  return { extractedName: null, extractedCpf: null, documentType: null, confidence: "LOW" };
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

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") || formData.get("pdf");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Arquivo PDF não fornecido." },
        { status: 400 }
      );
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");

    if (!isPdf && !isImage) {
      return NextResponse.json(
        { success: false, error: "Formato de arquivo inválido. Por favor, envie um arquivo em formato PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const safeName = sanitizeFileName(file.name);
    const filePath = `identity-documents/user-${userId}-${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images")
      .upload(filePath, buffer, {
        contentType: file.type || "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: `Erro no upload do documento: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("property-images")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // Analyze document content with Gemini AI
    const analysis = await analyzeIdentityDocumentWithGemini(
      buffer,
      file.type || (isPdf ? "application/pdf" : "image/jpeg")
    );

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    let nameUpdated = false;
    let cpfUpdated = false;
    const updatePayload: any = {
      identityDocumentUrl: publicUrl,
      identityDocumentVerified: true,
    };

    // If Gemini extracted name and it's different from user's current name
    if (analysis.extractedName && analysis.extractedName.length > 2 && analysis.extractedName !== currentUser.name.toUpperCase()) {
      updatePayload.name = analysis.extractedName;
      nameUpdated = true;
    }

    // If Gemini extracted CPF and it's different from user's current cpfCnpj
    if (analysis.extractedCpf && analysis.extractedCpf.length >= 11 && analysis.extractedCpf !== currentUser.cpfCnpj) {
      updatePayload.cpfCnpj = analysis.extractedCpf;
      cpfUpdated = true;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      select: {
        id: true,
        name: true,
        email: true,
        cpfCnpj: true,
        identityDocumentUrl: true,
        identityDocumentVerified: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Documento de identidade em PDF carregado e verificado com sucesso!",
      identityDocumentUrl: publicUrl,
      user: updatedUser,
      nameUpdated,
      cpfUpdated,
      extractedName: analysis.extractedName,
      extractedCpf: analysis.extractedCpf,
      confidence: analysis.confidence,
    });
  } catch (error: any) {
    console.error("Erro no upload de documento de identidade:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno ao processar documento." },
      { status: 500 }
    );
  }
}
