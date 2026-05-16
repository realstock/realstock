import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    const pageToken = pageData.data?.find((p: any) => p.id === pageId)?.access_token;
    
    const postId = "1100957826423325_122109098258883331"; 
    const res = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=object_id&access_token=${pageToken}`);
    const data = await res.json();
    console.log("Object ID:", data.object_id);
    
    if (data.object_id) {
       const res2 = await fetch(`https://graph.facebook.com/v21.0/${data.object_id}?fields=views&access_token=${pageToken}`);
       console.log("Views on Object ID:", await res2.json());
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
