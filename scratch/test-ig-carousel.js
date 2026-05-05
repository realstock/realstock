const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const finalMediaId = '17977528145842521';
    
    try {
        // Let's verify if the likes increased to 2, which confirms it's the right post
        const baseRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}?fields=like_count,comments_count,media_type,timestamp&access_token=${igToken}`);
        const baseData = await baseRes.json();
        console.log("Base Data:", JSON.stringify(baseData));

        if (baseData && !baseData.error && baseData.media_type === 'CAROUSEL_ALBUM') {
            console.log("Attempting carousel specific metrics...");
            const metricsToTry = ['carousel_album_impressions,carousel_album_reach,carousel_album_engagement', 'impressions,reach'];
            
            for (const metricString of metricsToTry) {
                console.log(`\nTrying metrics: ${metricString}`);
                const insRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}/insights?metric=${metricString}&access_token=${igToken}`);
                const insData = await insRes.json();
                console.log(`Result:`, JSON.stringify(insData, null, 2));
                if (!insData.error) break;
            }
        }
    } catch(e) {
        console.error(e);
    }
}
main();
