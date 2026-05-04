require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const prop = await prisma.property.findUnique({ where: { id: 37 } });
  const sessions = await prisma.instagramPreviewSession.findMany({ where: { listingId: 37 } });
  console.log('Property IG ID:', prop ? prop.instagramMediaId : 'Not Found');
  console.log('Sessions:', sessions);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
