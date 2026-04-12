const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const services = await prisma.siteService.findMany();
  console.log(services);
}
main().finally(() => prisma.$disconnect());
