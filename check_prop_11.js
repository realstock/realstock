const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const prop = await prisma.property.findUnique({
    where: { id: 11 }
  });
  fs.writeFileSync('prop11.json', JSON.stringify(prop, null, 2));
}

main().catch(e => {
  fs.writeFileSync('prop11_error.txt', e.message);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
