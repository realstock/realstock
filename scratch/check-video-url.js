const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      portfolioVideoUrl: { not: null }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  if (user) {
    console.log("User ID:", user.id);
    console.log("Portfolio Video URL:", user.portfolioVideoUrl);
  } else {
    console.log("No user found with portfolio video.");
  }
}

main();
