const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const propertyId = 37;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const property = await prisma.property.findUnique({where: {id: 37}});
    
    const igSessions = await prisma.instagramPreviewSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    
    const igMediaIds = igSessions.map(s => ({ id: s.publishedMediaId, type: s.postType }));
    if (property.instagramMediaId && !igMediaIds.find(i => i.id === property.instagramMediaId)) {
        igMediaIds.push({ id: property.instagramMediaId, type: 'carousel' });
    }

    console.log("IG IDs to check:", igMediaIds);

    const instagramPosts = [];
    for (const item of igMediaIds) {
        if (!item.id) continue;
        try {
            const baseRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}?fields=like_count,comments_count,timestamp,media_type&access_token=${igToken}`);
            const baseData = await baseRes.json();
            
            console.log(`IG Base Data for ${item.id}:`, baseData.media_type);

            if (baseData && !baseData.error) {
                let postType = item.type;
                if (baseData.media_type === 'VIDEO') postType = 'reels';
                else if (baseData.media_type === 'CAROUSEL_ALBUM') postType = 'carousel';

                instagramPosts.push({
                    type: postType,
                    likes: baseData.like_count || 0
                });
            }
        } catch(e) {}
    }
    console.log("Instagram Posts Array:", instagramPosts);

    // FB
    const fbSessions = await prisma.facebookFeedSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });

    console.log("FB Sessions found:", fbSessions.map(s => s.publishedPostId));
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
    const pageTokenData = await pageTokenRes.json();
    const pageInfo = pageTokenData.data?.find((p) => p.id === pageId);

    for (const fbSession of fbSessions) {
        let views = 0;
        try {
            const insRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_impressions&access_token=${pageInfo.access_token}`);
            const insData = await insRes.json();
            if (insData && insData.data && !insData.error) {
                views = insData.data.find(m => m.name === 'post_impressions')?.values[0]?.value || 0;
            } else if (insData.error) {
                const vidRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_video_views&access_token=${pageInfo.access_token}`);
                const vidData = await vidRes.json();
                if (vidData && vidData.data && !vidData.error) {
                    views = vidData.data.find(m => m.name === 'post_video_views')?.values[0]?.value || 0;
                } else if (vidData.error) {
                    const unqRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_impressions_unique&access_token=${pageInfo.access_token}`);
                    const unqData = await unqRes.json();
                    if (unqData && unqData.data && !unqData.error) {
                        views = unqData.data.find(m => m.name === 'post_impressions_unique')?.values[0]?.value || 0;
                    }
                }
            }
        } catch(e) {}
        console.log(`FB Post ${fbSession.publishedPostId} Views:`, views);
    }
}
main();
