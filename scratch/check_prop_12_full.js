require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prop = await prisma.property.findUnique({
    where: { id: 12 }
  });
  console.log(JSON.stringify(prop, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
