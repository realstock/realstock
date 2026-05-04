const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const p = await prisma.property.findUnique({
        where: { id: 37 },
        select: { googleBoostedUntil: true, metaBoostedUntil: true }
    });
    console.log("Boost info:", p);

    const goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: 37, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    });
    console.log("Google session:", goSession);
}
main();
