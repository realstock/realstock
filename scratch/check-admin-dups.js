const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: -2 },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(JSON.stringify(sessions, null, 2));
}

main().finally(() => prisma.$disconnect());
