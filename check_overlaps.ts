import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const igDuplicates = await prisma.$queryRaw`
        SELECT "publishedMediaId", COUNT(*) as count
        FROM "InstagramPreviewSession"
        WHERE status = 'PUBLISHED' AND "publishedMediaId" IS NOT NULL
        GROUP BY "publishedMediaId"
        HAVING COUNT(*) > 1
    `;
    console.log("IG Duplicates:", JSON.stringify(igDuplicates, null, 2));

    const fbDuplicates = await prisma.$queryRaw`
        SELECT "publishedPostId", COUNT(*) as count
        FROM "FacebookFeedSession"
        WHERE status = 'PUBLISHED' AND "publishedPostId" IS NOT NULL
        GROUP BY "publishedPostId"
        HAVING COUNT(*) > 1
    `;
    console.log("FB Duplicates:", JSON.stringify(fbDuplicates, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
