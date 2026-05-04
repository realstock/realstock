const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env.local' });

async function main() {
    const publishedPostId = '122108207834883331';
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
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
