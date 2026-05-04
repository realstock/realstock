const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const finalMediaId = '17977528145842521';
    
    try {
        const baseRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}?fields=like_count,comments_count,timestamp&access_token=${igToken}`);
        const baseData = await baseRes.json();
        console.log("Base Data:", JSON.stringify(baseData));

        if (baseData && !baseData.error) {
            const insRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}/insights?metric=impressions,reach,video_views,plays,shares,saved&access_token=${igToken}`);
            const insData = await insRes.json();
            console.log("Insights Data:", JSON.stringify(insData));
        }
    } catch(e) {
        console.error(e);
    }
}
main();
