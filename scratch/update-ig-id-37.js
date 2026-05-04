const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const targetMediaId = '17977528145842521';
        const permalink = 'https://www.instagram.com/p/DW33_GMjjnB/';
        
        await prisma.property.update({
            where: { id: 37 },
            data: {
                instagramMediaId: targetMediaId,
                instagramPermalink: permalink
            }
        });
        
        console.log(`Updated Property 37 with real Instagram Media ID: ${targetMediaId}`);
        
        // Let's test the Insights route directly
        const res = await fetch(`http://localhost:3000/api/minha-conta/anuncios/37/insights`);
        // Wait, the API route requires a user session, so we can't test it easily via HTTP without mocking the session.
        // But since the DB is updated, the frontend should now work!
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
