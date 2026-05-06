import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const prop = await prisma.property.findUnique({
    where: { id: 12 },
    select: { id: true, title: true, metaAdId: true, metaBoostedUntil: true }
  });
  console.log(JSON.stringify(prop, null, 2));
}
main().finally(() => prisma.$disconnect());
