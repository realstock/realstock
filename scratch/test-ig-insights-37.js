const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env' });

async function main() {
    const propertyId = 37;
    try {
        const property = await prisma.property.findUnique({ where: { id: propertyId } });
        if (!property) {
            console.log("Property 37 not found");
            return;
        }

        const mediaIdToQuery = property.instagramMediaId;
        const igSessionFallback = !mediaIdToQuery ? await prisma.instagramPreviewSession.findFirst({
            where: { listingId: propertyId, status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
        }) : null;

        const finalMediaId = mediaIdToQuery || igSessionFallback?.publishedMediaId;

        console.log(`Instagram Media ID for property 37: ${finalMediaId}`);

        if (finalMediaId) {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            const baseRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}?fields=like_count,comments_count,updated_at&access_token=${igToken}`);
            const baseData = await baseRes.json();
            
            console.log("Base Data Response:", JSON.stringify(baseData, null, 2));

            const insRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}/insights?metric=impressions,reach,video_views,plays,shares&access_token=${igToken}`);
            const insData = await insRes.json();
            console.log("Insights Response:", JSON.stringify(insData, null, 2));
        } else {
            console.log("No media ID found in DB for property 37.");
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
