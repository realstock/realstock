const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env' });

async function main() {
    try {
        const propertyId = 37;
        const property = await prisma.property.findFirst({
          where: { id: propertyId },
        });

        if (!property) {
            console.log("Property not found");
            return;
        }

        console.log(`DB Property instagramMediaId: ${property.instagramMediaId}`);

        const mediaIdToQuery = property.instagramMediaId;
        const igSessionFallback = !mediaIdToQuery ? await prisma.instagramPreviewSession.findFirst({
            where: { listingId: propertyId, status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
        }) : null;

        const finalMediaId = mediaIdToQuery || igSessionFallback?.publishedMediaId;
        console.log(`Final Media ID to query: ${finalMediaId}`);

        if (finalMediaId) {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            const baseRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}?fields=like_count,comments_count,updated_at&access_token=${igToken}`);
            const baseData = await baseRes.json();
            console.log("Base Data:", JSON.stringify(baseData));
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
