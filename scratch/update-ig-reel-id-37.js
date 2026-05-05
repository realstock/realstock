const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const targetMediaId = '17859991122593937'; // The correct Reel ID
        const permalink = 'https://www.instagram.com/p/CURRENT_REEL_LINK/';
        
        await prisma.property.update({
            where: { id: 37 },
            data: {
                instagramMediaId: targetMediaId,
            }
        });
        
        console.log(`Updated Property 37 with Instagram Reel ID: ${targetMediaId}`);
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
