import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting ALL properties flags...');
  const resProps = await prisma.property.updateMany({
    data: {
      boostedUntil: null,
      googleBoostedUntil: null,
      sponsoredUntil: null,
      reelsVideoPaidAt: null,
      reelsVideoUrl: null,
      instagramMediaId: null,
      instagramPermalink: null,
    }
  });
  console.log('Properties updated:', resProps.count);

  console.log('Resetting ALL users portfolio flags...');
  const resUsers = await prisma.user.updateMany({
    data: {
      portfolioBoostedUntil: null,
      googlePortfolioBoostedUntil: null,
      metaPortfolioBoostedUntil: null,
      portfolioVideoPaidAt: null,
      portfolioVideoUrl: null,
      logoBoostedUntil: null,
    }
  });
  console.log('Users updated:', resUsers.count);

  console.log('Cleaning up sessions...');
  await prisma.instagramPreviewSession.deleteMany({});
  await prisma.facebookFeedSession.deleteMany({});
  await prisma.googleAdsSession.deleteMany({});
  await prisma.metaAdsSession.deleteMany({});

  console.log('Reset complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
