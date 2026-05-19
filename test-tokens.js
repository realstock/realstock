const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.passwordResetToken.findMany({ 
    where: { userId: 3 },
    orderBy: { createdAt: 'desc' },
    take: 3
  });
  console.log("Tokens for user 3:", tokens);
}
main().catch(console.error).finally(() => prisma.$disconnect());
