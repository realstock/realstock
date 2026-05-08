
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const property = await prisma.property.findUnique({
    where: { id: 40 },
    include: { videos: true }
  });
  console.log('PROPERTY 40:', JSON.stringify(property, null, 2));
  process.exit(0);
}

check();
