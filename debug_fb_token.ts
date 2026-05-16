import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    const pageToken = pageData.data?.find((p: any) => p.id === pageId)?.access_token;
    
    // We need an App Token for debug_token, or we can use the User Token to debug itself
    const res = await fetch(`https://graph.facebook.com/debug_token?input_token=${pageToken}&access_token=${userToken}`);
    console.log(JSON.stringify(await res.json(), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
