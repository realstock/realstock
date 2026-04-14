const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    await prisma.metaAdsSession.create({
        data: {
             listingId: 12,
             campaignId: "120244926471560663",
             status: "ACTIVE",
             budget: 150,
             budgetDays: 5,
             platform: "meta"
        }
    });
    console.log("Database fixed!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
