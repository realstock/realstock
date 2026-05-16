const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.instagramPreviewSession.findMany({
    where: { status: { not: 'PUBLISHED' } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  console.log("Instagram Drafts/Errors:", JSON.stringify(sessions, null, 2));

  const fbSessions = await prisma.facebookFeedSession.findMany({
    where: { status: { not: 'PUBLISHED' } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log("Facebook Drafts/Errors:", JSON.stringify(fbSessions, null, 2));
}

main();
