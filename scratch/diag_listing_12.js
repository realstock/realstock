
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const propertyId = 12;
  console.log(`--- DIAGNÓSTICO IMÓVEL ${propertyId} ---`);
  
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, metaAdId: true, metaCampaignId: true, instagramMediaId: true }
  });
  console.log('Property Data:', JSON.stringify(property, null, 2));

  const fbSessions = await prisma.facebookFeedSession.findMany({
    where: { listingId: propertyId }
  });
  console.log('Facebook Sessions:', JSON.stringify(fbSessions.map(s => ({ id: s.publishedPostId, type: s.postType })), null, 2));

  const igSessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: propertyId }
  });
  console.log('Instagram Sessions:', JSON.stringify(igSessions.map(s => ({ id: s.publishedMediaId, type: s.postType })), null, 2));

  const adsSessions = await prisma.metaAdsSession.findMany({
    where: { listingId: propertyId }
  });
  console.log('Meta Ads Sessions:', JSON.stringify(adsSessions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
