import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    const pageToken = pageData.data?.find((p: any) => p.id === pageId)?.access_token;
    
    const postId = "1100957826423325_4330233750627616"; // Property 12 FB Reel Post ID
    const res = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=id,object_id,message,attachments{target}&access_token=${pageToken}`);
    console.log(JSON.stringify(await res.json(), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
