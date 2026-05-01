import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const userEmail = 'leobatisti@gmail.com'; 
  
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('Resetting portfolio data for user:', user.email);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      portfolioBoostedUntil: null,
      googlePortfolioBoostedUntil: null,
      portfolioVideoPaidAt: null,
      portfolioVideoUrl: null,
    }
  });

  console.log('Resetting property data...');
  await prisma.property.updateMany({
    where: { ownerId: user.id },
    data: {
      boostedUntil: null,
      googleBoostedUntil: null,
      sponsoredUntil: null,
      reelsVideoPaidAt: null,
      reelsVideoUrl: null,
    }
  });

  console.log('Clearing social post sessions...');
  await prisma.instagramPreviewSession.deleteMany({
    where: { listingId: { in: [0] } } 
  });
  
  await prisma.facebookFeedSession.deleteMany({
    where: { listingId: { in: [0] } }
  });

  console.log('Cancelling Google Ads sessions...');
  await prisma.googleAdsSession.updateMany({
    where: { status: 'ACTIVE' },
    data: { status: 'CANCELLED' }
  });

  console.log('Reset complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
