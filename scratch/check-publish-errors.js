const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const session = await prisma.instagramPreviewSession.findFirst({
    where: { listingId: 0 },
    orderBy: { createdAt: 'desc' }
  });
  
  if (session) {
    console.log("Instagram Session ID:", session.id);
    console.log("Status:", session.status);
    console.log("Errors:", JSON.stringify(session.publishErrors, null, 2));
  } else {
    console.log("No Instagram session found for portfolio.");
  }

  const fbSession = await prisma.facebookFeedSession.findFirst({
    where: { listingId: 0 },
    orderBy: { createdAt: 'desc' }
  });

  if (fbSession) {
    console.log("Facebook Session ID:", fbSession.id);
    console.log("Status:", fbSession.status);
    console.log("Errors:", JSON.stringify(fbSession.publishErrors, null, 2));
  } else {
    console.log("No Facebook session found for portfolio.");
  }
}

main();
