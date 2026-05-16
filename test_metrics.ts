import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const propertyId = 12;
    console.log("Testing Property:", propertyId);
    
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!igToken) {
        console.error("No token");
        return;
    }

    // IG Sessions
    const igSessions = await prisma.instagramPreviewSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    
    console.log("\n--- INSTAGRAM ---");
    for (const s of igSessions) {
        console.log(`\nIG Session ${s.id} - Type: ${s.postType} - MediaID: ${s.publishedMediaId}`);
        if (!s.publishedMediaId) continue;
        
        try {
            const baseRes = await fetch(`https://graph.facebook.com/v21.0/${s.publishedMediaId}?fields=like_count,comments_count,timestamp,media_type&access_token=${igToken}`);
            const baseData = await baseRes.json();
            console.log("Base Data:", JSON.stringify(baseData));
            
            const isVideo = baseData.media_type === 'VIDEO';
            let metricName = 'impressions,reach,engagement';
            if (isVideo) metricName = 'plays,reach,total_interactions';
            else if (baseData.media_type === 'CAROUSEL_ALBUM') metricName = 'carousel_album_impressions,carousel_album_reach,carousel_album_engagement';
            
            console.log("Querying metrics:", metricName);
            const insRes = await fetch(`https://graph.facebook.com/v21.0/${s.publishedMediaId}/insights?metric=${metricName}&access_token=${igToken}`);
            const insData = await insRes.json();
            console.log("Insights Data:", JSON.stringify(insData).substring(0, 500));
        } catch(e) { console.error(e); }
    }
    
    // FB Sessions
    const fbSessions = await prisma.facebookFeedSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    
    console.log("\n--- FACEBOOK ---");
    for (const s of fbSessions) {
        console.log(`\nFB Session ${s.id} - Type: ${s.postType} - PostID: ${s.publishedPostId}`);
        if (!s.publishedPostId) continue;
        
        try {
            const res = await fetch(`https://graph.facebook.com/v21.0/${s.publishedPostId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,views,video_views,insights.metric(post_impressions,post_impressions_unique)&access_token=${igToken}`);
            const fbData = await res.json();
            console.log("FB Data:", JSON.stringify(fbData).substring(0, 500));
        } catch(e) { console.error(e); }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
