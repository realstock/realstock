const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.metaAdsSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log("Meta Ads Sessions:", JSON.stringify(sessions, null, 2));
}

main();
