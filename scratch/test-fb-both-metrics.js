const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find(p => p.id === pageId);

        const reelId = '1100957826423325_122108903702883331';

        console.log(`Trying to fetch both metrics for Reel ID: ${reelId}`);
        const insRes = await fetch(`https://graph.facebook.com/v19.0/${reelId}/insights?metric=post_impressions,post_video_views&access_token=${pageInfo.access_token}`);
        const insData = await insRes.json();
        console.log("Response:", JSON.stringify(insData, null, 2));

    } catch(e) {
        console.error("Error:", e);
    }
}
main();
