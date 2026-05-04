import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const results = [];

    // 1. Adicionar turbinar_credits na tabela users (se não existir)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "users" 
        ADD COLUMN IF NOT EXISTS "turbinar_credits" INTEGER NOT NULL DEFAULT 0;
      `);
      results.push("Coluna turbinar_credits adicionada com sucesso (ou já existia).");
    } catch (e: any) {
      results.push(`Aviso na tabela users: ${e.message}`);
    }

    // 2. Criar a tabela coupons
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "coupons" (
            "id" TEXT NOT NULL,
            "code" TEXT NOT NULL,
            "service_type" TEXT NOT NULL,
            "max_uses" INTEGER NOT NULL DEFAULT 1,
            "current_uses" INTEGER NOT NULL DEFAULT 0,
            "is_active" BOOLEAN NOT NULL DEFAULT true,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

            CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
        );
      `);
      results.push("Tabela coupons criada com sucesso (ou já existia).");
    } catch (e: any) {
      results.push(`Aviso na criação da tabela coupons: ${e.message}`);
    }

    // 3. Criar índice único para o código do cupom
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "coupons_code_key" ON "coupons"("code");
      `);
      results.push("Índice de cupom criado com sucesso.");
    } catch (e: any) {
      results.push(`Aviso na criação do índice: ${e.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: "Banco de dados atualizado via SQL manual com sucesso!",
      logs: results 
    });
  } catch (error: any) {
    console.error("DB UPDATE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
