const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env.local' });

async function main() {
    const publishedPostId = '1100957826423325_122108207834883331';
    try {
        const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const pageId = process.env.FACEBOOK_PAGE_ID;
        console.log("Tokens present:", !!userToken, !!pageId);
        
        if (userToken && pageId) {
            const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
            const pageTokenData = await pageTokenRes.json();
            
            const pageInfo = pageTokenData.data?.find(p => p.id === pageId);
            if (!pageInfo) {
                console.log("Page info not found in accounts");
                return;
            }

            console.log("Got page token, fetching insights...");
            const url = `https://graph.facebook.com/v19.0/${publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions)&access_token=${pageInfo.access_token}`;
            const res = await fetch(url);
            const data = await res.json();
            
            console.log("Response:", JSON.stringify(data, null, 2));
            
            if (data && !data.error) {
                let imps = 0;
                if (data.insights && data.insights.data) {
                    imps = data.insights.data.find(m => m.name === 'post_impressions')?.values[0].value || 0;
                }
                const facebook = {
                    likes: data.likes?.summary?.total_count || 0,
                    comments: data.comments?.summary?.total_count || 0,
                    shares: data.shares?.count || 0,
                    impressions: imps
                };
                console.log("Parsed Insights:", facebook);
            }
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
