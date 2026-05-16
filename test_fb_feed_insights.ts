import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    const pageToken = pageData.data?.find((p: any) => p.id === pageId)?.access_token;
    
    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed?fields=id,insights.metric(post_impressions,post_impressions_unique,post_video_views)&limit=5&access_token=${pageToken}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
