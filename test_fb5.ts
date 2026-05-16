import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const postId = "1100957826423325_122109098258883331"; // FB Post ID for Carousel
    console.log("Testing Post ID:", postId);
    
    // First, try the exact query the API route does
    let res = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,views,video_views&access_token=${fbToken}`);
    let data = await res.json();
    console.log("\nStandard Query:", JSON.stringify(data, null, 2));

    const reelId = "4330233750627616"; // FB Post ID for Reel
    console.log("\nTesting Reel ID:", reelId);
    res = await fetch(`https://graph.facebook.com/v21.0/${reelId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,views,video_views&access_token=${fbToken}`);
    data = await res.json();
    console.log("\nReel Query:", JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
