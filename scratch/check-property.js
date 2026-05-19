const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const properties = await prisma.property.findMany({
      select: {
        id: true,
        title: true,
        reelsVideoUrl: true,
        _count: {
          select: { images: true }
        }
      },
      orderBy: { id: 'desc' }
    });
    console.log("All properties in DB:", properties);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
