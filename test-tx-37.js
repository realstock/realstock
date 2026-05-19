const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.financialTransaction.findMany({
    where: { category: "POSTS", description: { contains: "37" } },
    orderBy: { createdAt: "desc" },
  });
  txs.forEach(t => console.log(t.id, t.description));
}
main().catch(console.error).finally(() => prisma.$disconnect());
