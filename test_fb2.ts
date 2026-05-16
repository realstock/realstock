import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const postId = "1100957826423325_122109098258883331"; // FB Post ID
    const res = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,views,video_views&access_token=${fbToken}`);
    const fbData = await res.json();
    console.log(JSON.stringify(fbData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
