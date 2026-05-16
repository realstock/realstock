import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const sId = "18041196029583643"; // Carousel
    
    console.log("Carousel:");
    let insRes = await fetch(`https://graph.facebook.com/v21.0/${sId}/insights?metric=reach,saved,views&access_token=${igToken}`);
    let insData = await insRes.json();
    console.log(JSON.stringify(insData, null, 2));

    const vId = "18029017436812098"; // Reel
    console.log("\nReel:");
    insRes = await fetch(`https://graph.facebook.com/v21.0/${vId}/insights?metric=reach,saved,views&access_token=${igToken}`);
    insData = await insRes.json();
    console.log(JSON.stringify(insData, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
