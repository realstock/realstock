import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    const pageToken = pageData.data?.find((p: any) => p.id === pageId)?.access_token;
    
    const postId = "1100957826423325_122109098258883331"; 
    
    const possibleMetrics = [
        "post_impressions",
        "post_reach",
        "post_clicks",
        "post_reactions_by_type_total",
        "post_video_views_organic"
    ];

    for (const m of possibleMetrics) {
        const res = await fetch(`https://graph.facebook.com/v21.0/${postId}/insights?metric=${m}&access_token=${pageToken}`);
        const data = await res.json();
        if (data.error) {
            console.log(`Metric ${m}: INVALID (${data.error.message})`);
        } else {
            console.log(`Metric ${m}: VALID`, JSON.stringify(data.data[0].values[0]));
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
