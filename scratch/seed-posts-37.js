const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const listingId = 37;

        // IG Carousel
        await prisma.instagramPreviewSession.create({
            data: {
                listingId,
                status: "PUBLISHED",
                postType: "carousel",
                publishedMediaId: "17977528145842521",
                allImageUrls: [],
                selectedImages: [],
                caption: "Imóveis em destaque no Ceará"
            }
        });

        // FB Reel
        await prisma.facebookFeedSession.create({
            data: {
                listingId,
                status: "PUBLISHED",
                postType: "reels",
                publishedPostId: "1100957826423325_122108903702883331",
                allImageUrls: [],
                selectedImages: [],
                caption: "Apto na Praia do Futuro com vista mar"
            }
        });

        // FB Carousel
        await prisma.facebookFeedSession.create({
            data: {
                listingId,
                status: "PUBLISHED",
                postType: "carousel",
                publishedPostId: "1100957826423325_122105488724883331",
                allImageUrls: [],
                selectedImages: [],
                caption: "Especial Oportunidades"
            }
        });

        console.log("Database seeded successfully with 4 posts (including the existing IG reel).");
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
