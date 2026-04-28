require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Tentando conectar ao banco via DATABASE_URL...");
    try {
        // Tentar rodar um SQL bruto para adicionar as colunas
        await prisma.$executeRawUnsafe(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "reels_video_url" TEXT;`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "reels_video_paid_at" TIMESTAMP;`);
        console.log("Colunas adicionadas com sucesso!");
    } catch (e) {
        console.error("Erro ao atualizar banco:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
