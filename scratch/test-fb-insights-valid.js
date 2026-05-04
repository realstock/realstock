const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find(p => p.id === pageId);

        const validPostId = '1100957826423325_122108903702883331';
        console.log(`Trying to fetch insights for valid post: ${validPostId}`);
        const url = `https://graph.facebook.com/v19.0/${validPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions)&access_token=${pageInfo.access_token}`;
        
        const res = await fetch(url);
        const data = await res.json();
        console.log("Success! Data:", JSON.stringify(data, null, 2));

    } catch(e) {
        console.error("Error:", e);
    }
}
main();
