import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Executa o comando SQL para adicionar a coluna se ela não existir
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "admin_sponsored_publications" 
      ADD COLUMN IF NOT EXISTS "custom_logo_url" TEXT;
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Banco de dados atualizado com sucesso! A coluna 'custom_logo_url' foi adicionada." 
    });
  } catch (error: any) {
    console.error("DB Upgrade Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
