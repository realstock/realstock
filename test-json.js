const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ig = await prisma.instagramPreviewSession.findFirst({
    where: { status: 'PUBLISHED', validationReport: { not: null } },
    orderBy: { createdAt: 'desc' }
  });
  console.log("IG:", ig ? ig.validationReport : "None");

  const fb = await prisma.facebookFeedSession.findFirst({
    where: { status: 'PUBLISHED', validationReport: { not: null } },
    orderBy: { createdAt: 'desc' }
  });
  console.log("FB:", fb ? fb.validationReport : "None");
}
main().catch(console.error).finally(() => prisma.$disconnect());
