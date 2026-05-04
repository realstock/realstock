const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find(p => p.id === pageId);

        // First let's find the ID of the reel shown in the screenshot.
        // It's on Facebook, published ~8h ago, text starts with "🌟 Apto na Praia do Futuro com vista mar..."
        const postsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,status_type&access_token=${pageInfo.access_token}`);
        const postsData = await postsRes.json();
        
        let reelId = null;
        if (postsData.data) {
            for (const post of postsData.data) {
                console.log(`- ID: ${post.id}, Message: ${post.message?.substring(0, 30)}, Type: ${post.status_type}`);
                if (post.message && post.message.includes('Apto na Praia do Futuro')) {
                    reelId = post.id;
                    break;
                }
            }
        }
        
        if (!reelId) {
            console.log("Could not find the reel post ID");
            return;
        }
        console.log(`\nFound Reel ID: ${reelId}`);

        // Try getting post_video_views
        const insRes = await fetch(`https://graph.facebook.com/v19.0/${reelId}/insights?metric=post_video_views&access_token=${pageInfo.access_token}`);
        const insData = await insRes.json();
        console.log("Insights post_video_views:", JSON.stringify(insData, null, 2));
        
        // Try getting video insights via the video edge directly
        // Post ID format is usually PAGEID_POSTID. Video ID is sometimes different.
        const vidId = reelId.split('_')[1];
        const vidRes = await fetch(`https://graph.facebook.com/v19.0/${vidId}/video_insights?access_token=${pageInfo.access_token}`);
        const vidData = await vidRes.json();
        console.log("Insights video_insights:", JSON.stringify(vidData, null, 2));

    } catch(e) {
        console.error("Error:", e);
    }
}
main();
