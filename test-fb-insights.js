const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fbSessions = await prisma.facebookFeedSession.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent FB Sessions:", fbSessions.map(s => ({ id: s.id, listingId: s.listingId, publishedPostId: s.publishedPostId })));
}
main();
