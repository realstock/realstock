const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env' });

async function main() {
    const propertyId = 37;
    try {
        const property = await prisma.property.findUnique({ 
            where: { id: propertyId },
            select: { instagramMediaId: true, instagramPermalink: true } 
        });
        console.log("Property 37 DB Record:", property);

        const sessions = await prisma.instagramPreviewSession.findMany({
            where: { listingId: propertyId },
            orderBy: { createdAt: "desc" },
            select: { id: true, status: true, publishedMediaId: true, validationReport: true }
        });
        console.log("IG Sessions for 37:", JSON.stringify(sessions, null, 2));
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
