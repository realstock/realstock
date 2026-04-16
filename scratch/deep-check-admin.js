const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pub = await prisma.adminSponsoredPublication.findUnique({
    where: { id: 'cmnyk8sl60000btkbhb1qutur' }
  });
  console.log("PUBLICAÇÃO ADMIN:", JSON.stringify(pub, null, 2));

  const sessions = await prisma.instagramPreviewSession.findMany({
    where: { caption: 'cmnyk8sl60000btkbhb1qutur' }
  });
  console.log("SESSIONS VINCULADAS:", JSON.stringify(sessions, null, 2));
}

main().finally(() => prisma.$disconnect());
