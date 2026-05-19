const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const propertyId = 10;
  const igSessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: propertyId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });
  console.log("IG Sessions for 10:", igSessions.map(s => ({
    id: s.id,
    type: s.postType,
    permalink: s.validationReport ? s.validationReport.permalink : null
  })));
  
  const property11 = 11;
  const ig11 = await prisma.instagramPreviewSession.findMany({
    where: { listingId: property11, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
  });
  console.log("IG Sessions for 11:", ig11.map(s => ({
    id: s.id,
    type: s.postType,
    permalink: s.validationReport ? s.validationReport.permalink : null
  })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
