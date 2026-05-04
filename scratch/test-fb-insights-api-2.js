const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env.local' });

async function main() {
    const publishedPostId = '1100957826423325_122108207834883331';
    try {
        const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const pageId = process.env.FACEBOOK_PAGE_ID;
        
        if (userToken && pageId) {
            const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
            const pageTokenData = await pageTokenRes.json();
            const pageInfo = pageTokenData.data?.find(p => p.id === pageId);

            console.log("Got page token, fetching basic fields...");
            const url = `https://graph.facebook.com/v19.0/${publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count)&access_token=${pageInfo.access_token}`;
            const res = await fetch(url);
            const data = await res.json();
            
            console.log("Basic Fields Response:", JSON.stringify(data, null, 2));
            
            console.log("\nFetching only insights...");
            const url2 = `https://graph.facebook.com/v19.0/${publishedPostId}/insights?metric=post_impressions&access_token=${pageInfo.access_token}`;
            const res2 = await fetch(url2);
            const data2 = await res2.json();
            
            console.log("Insights Only Response:", JSON.stringify(data2, null, 2));
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
