import { PrismaClient } from '@prisma/client';
import { createRealStockGoogleCampaign } from '../lib/googleAds';
const prisma = new PrismaClient();

async function main() {
    const props = await prisma.property.findMany({
        where: {
            title: {
                contains: "flecheiras",
                mode: "insensitive"
            }
        }
    });
    console.log("Found properties:", props.map(p => ({id: p.id, title: p.title})));

    const prop = props.find(p => p.title.toLowerCase().includes("atlantico") || p.title.toLowerCase().includes("atlântico"));
    if (!prop) return console.error("No exact match found");

    console.log("Restoring Google Ad for:", prop.id, prop.title);
    
    const res = await createRealStockGoogleCampaign(
        prop.id,
        prop.title,
        15, 
        `https://www.realstock.com.br/imovel/${prop.id}`
    );
    
    console.log("Google API Result:", res);
    
    if (res.success) {
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + 5);
        
        await prisma.googleAdsSession.create({
            data: {
                listingId: prop.id,
                campaignId: res.campaignId,
                adGroupId: res.adGroupId,
                status: "ACTIVE",
                budget: 15 * 5,
                budgetDays: 5,
                targetUrl: `https://www.realstock.com.br/imovel/${prop.id}`
            }
        });
        
        await prisma.property.update({
            where: { id: prop.id },
            data: { googleBoostedUntil: endTime }
        });
        
        console.log("Saved to database!");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
