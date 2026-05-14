require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function check() {
  const prop = await prisma.property.findUnique({
    where: { id: 12 },
    include: { images: true }
  });
  console.log("Property 12:", JSON.stringify(prop, null, 2));

  const igSessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: 12 }
  });
  console.log("IG Sessions:", JSON.stringify(igSessions, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
