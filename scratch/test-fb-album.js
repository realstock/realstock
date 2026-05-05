const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find((p) => p.id === pageId);

        const fbPostId = '1100957826423325_122105488724883331';

        const metrics = ['post_impressions', 'post_video_views', 'post_impressions_unique', 'post_engagements'];
        for (const metric of metrics) {
            console.log(`Testing fb metric: ${metric}`);
            const insRes = await fetch(`https://graph.facebook.com/v19.0/${fbPostId}/insights?metric=${metric}&access_token=${pageInfo.access_token}`);
            const insData = await insRes.json();
            if (insData.data && insData.data.length > 0) {
                 console.log(`Success ${metric}: ${insData.data[0].values[0].value}`);
            } else {
                 console.log(`Failed ${metric}:`, JSON.stringify(insData));
            }
        }
    } catch(e) {
        console.error(e);
    }
}
main();
