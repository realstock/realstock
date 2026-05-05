const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const propertyId = 37;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const fbSessions = await prisma.facebookFeedSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    
    console.log("FB Sessions found:", fbSessions.length);
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
    const pageTokenData = await pageTokenRes.json();
    const pageInfo = pageTokenData.data?.find((p) => p.id === pageId);

    for (const fbSession of fbSessions) {
        let views = 0;
        const insRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_impressions&access_token=${pageInfo.access_token}`);
        const insData = await insRes.json();
        
        console.log(`FB Post ${fbSession.publishedPostId} (Type: ${fbSession.postType}):`);
        
        if (insData && insData.data && !insData.error) {
            views = insData.data.find(m => m.name === 'post_impressions')?.values[0]?.value || 0;
            console.log(`  -> post_impressions: ${views}`);
        } else if (insData.error) {
            const vidRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_video_views&access_token=${pageInfo.access_token}`);
            const vidData = await vidRes.json();
            if (vidData && vidData.data && !vidData.error) {
                views = vidData.data.find(m => m.name === 'post_video_views')?.values[0]?.value || 0;
                console.log(`  -> post_video_views: ${views}`);
            } else {
                 console.log(`  -> vidError:`, vidData.error);
            }
        }
    }
}
main();
