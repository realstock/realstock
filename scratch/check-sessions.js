const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const igSessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: 37 },
    orderBy: { createdAt: 'desc' }
  });
  console.log("IG SESSIONS:");
  igSessions.forEach(s => {
    console.log(`ID: ${s.id}, PostType: ${s.postType}, Caption length: ${s.caption?.length || 0}`);
    console.log(`Caption: ${s.caption?.substring(0, 50)}...`);
    if(s.validationReport) {
      console.log(`Validation Report Caption: ${s.validationReport.caption?.substring(0, 50) || 'None'}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
