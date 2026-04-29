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

    // Adiciona a coluna para o pagamento único por imóvel
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "properties" 
      ADD COLUMN IF NOT EXISTS "contact_fee_paid_at" TIMESTAMP;
    `);

    return NextResponse.json({ 
      success: true, 
      message: "Banco de dados atualizado! Coluna 'contact_fee_paid_at' adicionada à tabela properties." 
    });
  } catch (error: any) {
    console.error("DB Upgrade Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
