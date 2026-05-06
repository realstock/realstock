import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const sessions = await prisma.facebookFeedSession.findMany({
    where: { listingId: 37 },
    select: { id: true, publishedPostId: true, postType: true, status: true }
  });
  console.log(JSON.stringify(sessions, null, 2));
}
main().finally(() => prisma.$disconnect());
