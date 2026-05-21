const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prop = await prisma.property.findUnique({
    where: { id: 37 }
  });
  console.log("LAT:", prop?.latitude);
  console.log("LNG:", prop?.longitude);
}

main().catch(console.error).finally(() => prisma.$disconnect());
