import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_IMAGE_SIZE_BYTES = 500 * 1024;

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

    const formData = (await req.formData()) as any;
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Arquivo inválido." },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Formato inválido. Use JPG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "Arquivo muito grande. Cada imagem deve ter no máximo 500 KB.",
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