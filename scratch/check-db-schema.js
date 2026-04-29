const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const user = await prisma.user.findFirst({
        select: { portfolioVideoUrl: true }
    });
    console.log("Success! Column exists. First user portfolioVideoUrl:", user?.portfolioVideoUrl);
  } catch (e) {
    console.error("Column still missing:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
