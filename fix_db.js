require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function run() {
  const propId = 37;
  
  const prop = await prisma.property.findUnique({ where: { id: propId } });
  if (!prop) {
    console.log("Property not found");
    return;
  }
  
  console.log("Updating Property 37 to have instagramMediaId...");
  await prisma.property.update({
    where: { id: propId },
    data: { instagramMediaId: "MANUAL_FIX_FOR_37" }
  });
  
  const existingIgSession = await prisma.instagramPreviewSession.findFirst({
    where: { listingId: propId, postType: "carousel" }
  });
  
  if (!existingIgSession) {
    console.log("Creating missing Instagram Session...");
    await prisma.instagramPreviewSession.create({
      data: {
        listingId: propId,
        postType: "carousel",
        status: "PUBLISHED",
        validationReport: { permalink: "https://instagram.com" },
        publishedMediaId: "MANUAL_FIX",
        allImageUrls: [],
        selectedImages: []
      }
    });
  } else {
    console.log("Updating existing Instagram Session to PUBLISHED...");
    await prisma.instagramPreviewSession.update({
      where: { id: existingIgSession.id },
      data: { status: "PUBLISHED" }
    });
  }

  // Same for Facebook
  const existingFbSession = await prisma.facebookFeedSession.findFirst({
    where: { listingId: propId, postType: "carousel" }
  });
  
  if (!existingFbSession) {
    console.log("Creating missing Facebook Session...");
    await prisma.facebookFeedSession.create({
      data: {
        listingId: propId,
        postType: "carousel",
        status: "PUBLISHED",
        validationReport: { permalink: "https://facebook.com" },
        publishedPostId: "MANUAL_FIX",
        allImageUrls: [],
        selectedImages: []
      }
    });
  } else {
    console.log("Updating existing Facebook Session to PUBLISHED...");
    await prisma.facebookFeedSession.update({
      where: { id: existingFbSession.id },
      data: { status: "PUBLISHED" }
    });
  }

  console.log("Property 37 fixed!");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
