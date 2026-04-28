import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Tentar rodar o SQL para adicionar as colunas faltantes
    await prisma.$executeRawUnsafe(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "reels_video_url" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "reels_video_paid_at" TIMESTAMP;`);

    return NextResponse.json({ 
      success: true, 
      message: "Banco de dados atualizado com sucesso! As colunas de vídeo foram adicionadas." 
    });
  } catch (error: any) {
    console.error("FIX DB ERROR:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
