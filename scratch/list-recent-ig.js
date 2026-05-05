const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;

    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${igToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find((p) => p.id === pageId);

        const fbPageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageInfo.access_token}`);
        const fbPageData = await fbPageRes.json();
        const igUserId = fbPageData.instagram_business_account?.id;

        const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=20&access_token=${igToken}`);
        const mediaData = await mediaRes.json();
        
        console.log("Recent IG Media:");
        for (const m of mediaData.data) {
            console.log(`ID: ${m.id}`);
            console.log(`Type: ${m.media_type}`);
            console.log(`Likes: ${m.like_count}`);
            console.log(`Caption: ${m.caption?.substring(0, 50).replace(/\n/g, ' ')}...`);
            
            const insRes = await fetch(`https://graph.facebook.com/v19.0/${m.id}/insights?metric=views,reach,shares&access_token=${igToken}`);
            const insData = await insRes.json();
            if (insData.data) {
                const views = insData.data.find(x => x.name === 'views')?.values[0]?.value || 0;
                console.log(`Views: ${views}`);
            } else {
                 console.log(`Insights Error:`, insData.error?.message);
            }
            console.log('---');
        }
    } catch(e) {
        console.error(e);
    }
}
main();
