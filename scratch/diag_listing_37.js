
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const propertyId = 37;
  console.log(`--- DIAGNÓSTICO IMÓVEL ${propertyId} ---`);
  
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });
  console.log('Property Data:', JSON.stringify(property, null, 2));

  const igSessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: propertyId }
  });
  console.log('Instagram Sessions:', JSON.stringify(igSessions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
