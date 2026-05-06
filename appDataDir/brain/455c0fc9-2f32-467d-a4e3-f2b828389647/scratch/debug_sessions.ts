import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.facebookFeedSession.findMany({
    where: { listingId: 12 },
    select: {
      id: true,
      listingId: true,
      publishedPostId: true,
      postType: true,
      status: true,
    },
  });
  console.log(JSON.stringify(sessions, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
