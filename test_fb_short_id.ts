import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    const pageToken = pageData.data?.find((p: any) => p.id === pageId)?.access_token;
    
    const postId = "122109098258883331"; 
    const res = await fetch(`https://graph.facebook.com/v21.0/${postId}/insights?metric=post_impressions&access_token=${pageToken}`);
    console.log(JSON.stringify(await res.json(), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
