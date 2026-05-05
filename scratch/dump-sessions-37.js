const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const prop = await prisma.property.findUnique({ where: { id: 37 } });
    console.log("Property IG ID:", prop.instagramMediaId);
    
    const igSess = await prisma.instagramPreviewSession.findMany({ where: { listingId: 37 }});
    console.log("IG Sessions:", igSess.map(s => ({ id: s.publishedMediaId, type: s.postType })));
    
    const fbSess = await prisma.facebookFeedSession.findMany({ where: { listingId: 37 }});
    console.log("FB Sessions:", fbSess.map(s => ({ id: s.publishedPostId, type: s.postType })));
}
main();
