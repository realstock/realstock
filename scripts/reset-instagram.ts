import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  // Find the property by title containing "Terreno no Con. Atlantico Flecheiras"
  const property = await prisma.property.findFirst({
    where: {
      title: {
        contains: 'Flecheiras',
        mode: 'insensitive',
      },
    },
  });

  if (!property) {
    console.log('Property not found.');
    return;
  }

  console.log(`Found property: ${property.title} (ID: ${property.id})`);

  const sessions = await prisma.instagramPreviewSession.findMany({
    where: {
      listingId: property.id,
      status: 'PUBLISHED'
    },
  });

  console.log(`Found ${sessions.length} PUBLISHED sessions.`);

  if (sessions.length > 0) {
    // Delete them
    const result = await prisma.instagramPreviewSession.deleteMany({
      where: {
        listingId: property.id,
      },
    });
    console.log(`Deleted ${result.count} sessions. Status reset for property ID: ${property.id}`);
  } else {
    // maybe we just update any existing ones to DRAFT
    const result2 = await prisma.instagramPreviewSession.updateMany({
       where: { listingId: property.id },
       data: { status: 'DRAFT', publishedMediaId: null }
    });
    console.log(`Updated ${result2.count} sessions to DRAFT.`);
  }

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
