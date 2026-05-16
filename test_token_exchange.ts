import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    console.log("User Token Length:", userToken?.length);
    console.log("Target Page ID:", pageId);

    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
    const pageData = await pageRes.json();
    
    if (pageData.error) {
        console.error("Exchange Error:", JSON.stringify(pageData.error, null, 2));
        return;
    }

    console.log("Pages Found:", pageData.data?.length || 0);
    const pageInfo = pageData.data?.find((p: any) => p.id === pageId);
    
    if (pageInfo) {
        console.log("SUCCESS: Page found!", pageInfo.name);
        console.log("Page Token Length:", pageInfo.access_token?.length);
        
        // Test query with this token
        const postId = "1100957826423325_122109098258883331";
        const res = await fetch(`https://graph.facebook.com/v21.0/${postId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,views,video_views&access_token=${pageInfo.access_token}`);
        const fbData = await res.json();
        console.log("FB Post Data with Page Token:", JSON.stringify(fbData, null, 2));
    } else {
        console.log("FAILURE: Page ID not found in /me/accounts");
        console.log("Available Pages:", pageData.data?.map((p: any) => `${p.name} (${p.id})`).join(", "));
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
