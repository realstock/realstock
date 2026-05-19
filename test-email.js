const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'leobatisti@hotmail.com' } });
  console.log("User:", user ? "EXISTS" : "DOES NOT EXIST");
  if(user) console.log(user);
}
main().catch(console.error).finally(() => prisma.$disconnect());
