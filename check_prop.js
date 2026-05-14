const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const props = await prisma.property.findMany({
    where: { title: { contains: 'Flecheiras', mode: 'insensitive' } },
    select: { id: true, title: true, metaAdId: true, metaCampaignId: true, instagramMediaId: true }
  });
  console.log(JSON.stringify(props, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
