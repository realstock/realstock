const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const property = await prisma.property.findUnique({
    where: { id: 37 }
  });
  console.log("PROPERTY 37 FIELDS:");
  console.log("reelsVideoUrl:", property.reelsVideoUrl);
  console.log("title:", property.title);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
