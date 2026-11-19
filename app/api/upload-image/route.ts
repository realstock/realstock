import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB (limite do bucket Supabase Storage)

function sanitizeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .toLowerCase();
}

export async function POST(req: Request) {
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

    const contentType = req.headers.get("content-type") || "";

    // 1. FLUXO DIRETO VIA URL ASSINADA (JSON) - Bypassa o limite de 4.5MB da Vercel
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const action = body.action || "sign-url";

      if (action === "sign-url") {
        const rawFileName = body.fileName || "arquivo";
        const fileSize = Number(body.fileSize || 0);

        if (fileSize > MAX_FILE_SIZE_BYTES) {
          return NextResponse.json(
            {
              success: false,
              error: `Arquivo muito grande (${(fileSize / (1024 * 1024)).toFixed(1)} MB). O limite máximo permitido para vídeos é de 50 MB.`,
            },
            { status: 400 }
          );
        }

        const safeName = sanitizeFileName(rawFileName);
        const filePath = `users/${userId}/${Date.now()}-${safeName}`;

        const { data, error } = await supabaseAdmin.storage
          .from("property-images")
          .createSignedUploadUrl(filePath, { upsert: true });

        if (error || !data) {
          console.error("Erro ao gerar signed URL do Supabase:", error);
          return NextResponse.json(
            { success: false, error: error?.message || "Erro ao obter permissão de upload." },
            { status: 500 }
          );
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("property-images")
          .getPublicUrl(filePath);

        return NextResponse.json({
          success: true,
          signedUrl: data.signedUrl,
          token: data.token,
          filePath,
          publicUrl: publicUrlData.publicUrl,
        });
      }

      return NextResponse.json({ success: false, error: "Ação não reconhecida." }, { status: 400 });
    }

    // 2. FLUXO MULTIPART FORMDATA (Legado / Fallback para arquivos pequenos)
    const formData = (await req.formData()) as any;
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Arquivo inválido." },
        { status: 400 }
      );
    }

    const isImage = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|heic|avif)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i.test(file.name);
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

    if (!isImage && !isVideo && !isAudio && !isPdf) {
      return NextResponse.json(
        { success: false, error: "Formato inválido. Use Imagens, Vídeos, Áudios ou PDF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Arquivo muito grande. O limite máximo é de 200 MB.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeName = sanitizeFileName(file.name);
    const filePath = `users/${userId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = supabaseAdmin.storage
      .from("property-images")
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: data.publicUrl,
      imageUrl: data.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error("UPLOAD IMAGE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao enviar imagem.",
      },
      { status: 500 }
    );
  }
}