import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    const pageToken = pageData.data?.find((p: any) => p.id === pageId)?.access_token;
    
    const postId = "1100957826423325_122109098258883331"; 
    
    const metrics = [
        "post_impressions",
        "post_impressions_unique",
        "post_video_views",
        "post_clicks"
    ];

    console.log("Testing metrics for post:", postId);
    const res = await fetch(`https://graph.facebook.com/v21.0/${postId}/insights?metric=${metrics.join(",")}&access_token=${pageToken}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
