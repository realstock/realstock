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

            console.log("Got page token, checking object type for long ID...");
            const url1 = `https://graph.facebook.com/v19.0/${publishedPostId}?metadata=1&access_token=${pageInfo.access_token}`;
            const res1 = await fetch(url1);
            const data1 = await res1.json();
            console.log("Long ID Metadata:", JSON.stringify(data1, null, 2));

            const shortId = '122108207834883331';
            console.log("\nChecking object type for short ID...");
            const url2 = `https://graph.facebook.com/v19.0/${shortId}?metadata=1&access_token=${pageInfo.access_token}`;
            const res2 = await fetch(url2);
            const data2 = await res2.json();
            console.log("Short ID Metadata:", JSON.stringify(data2, null, 2));
            
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
