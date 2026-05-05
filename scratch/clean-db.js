const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.instagramPreviewSession.deleteMany({
        where: { publishedMediaId: { in: ['MANUAL_FIX', 'MANUAL_FIX_REELS'] } }
    });
    await prisma.facebookFeedSession.deleteMany({
        where: { publishedPostId: { in: ['MANUAL_FIX', 'MANUAL_FIX_REELS'] } }
    });
    console.log("Deleted mock sessions");
}
main();
