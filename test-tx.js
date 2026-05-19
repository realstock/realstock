const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const txs = await prisma.financialTransaction.findMany({
    where: { category: "POSTS" },
    orderBy: { createdAt: "desc" },
    take: 10
  });
  txs.forEach(t => console.log(t.id, t.description));
}
main().catch(console.error).finally(() => prisma.$disconnect());
