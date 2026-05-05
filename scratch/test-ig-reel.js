const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find(p => p.id === pageId);
        
        const igAccRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageInfo.access_token}`);
        const igAccData = await igAccRes.json();
        const igAccountId = igAccData.instagram_business_account?.id;
        
        const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media?fields=id,caption,media_type,like_count,permalink&limit=20&access_token=${pageInfo.access_token}`);
        const mediaData = await mediaRes.json();
        
        console.log("Looking for Reel with 'Praia do Futuro'...");
        let targetReelId = null;
        
        if (mediaData.data) {
            mediaData.data.forEach(m => {
                const preview = m.caption ? m.caption.substring(0, 50).replace(/\n/g, ' ') : '';
                if (m.media_type === 'VIDEO' && preview.toLowerCase().includes('praia do futuro')) {
                    console.log(`FOUND REEL - ID: ${m.id} | Likes: ${m.like_count} | Link: ${m.permalink}`);
                    console.log(`Caption: ${preview}`);
                    targetReelId = m.id;
                }
            });
        }
        
        if (targetReelId) {
            console.log(`\nTesting 'views' and 'reach' metrics for Reel ID: ${targetReelId}`);
            const insRes = await fetch(`https://graph.facebook.com/v19.0/${targetReelId}/insights?metric=views,reach&access_token=${pageInfo.access_token}`);
            const insData = await insRes.json();
            console.log(`Result:`, JSON.stringify(insData, null, 2));
        }

    } catch(e) {
        console.error("Error:", e);
    }
}
main();
