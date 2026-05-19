const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const propertyId = 37;
  const igSessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: propertyId },
    orderBy: { createdAt: "desc" },
  });
  console.log("IG Sessions for 37:", igSessions.map(s => ({
    id: s.id,
    type: s.postType,
    status: s.status,
    permalink: s.validationReport ? s.validationReport.permalink : null
  })));
  
  const fbSessions = await prisma.facebookFeedSession.findMany({
    where: { listingId: propertyId },
    orderBy: { createdAt: "desc" },
  });
  console.log("FB Sessions for 37:", fbSessions.map(s => ({
    id: s.id,
    type: s.postType,
    status: s.status,
    permalink: s.validationReport ? s.validationReport.permalink : null
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
