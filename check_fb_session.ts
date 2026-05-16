import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const s = await prisma.facebookFeedSession.findFirst({
        where: { publishedPostId: "1100957826423325_122109098258883331" }
    });
    console.log(JSON.stringify(s, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
