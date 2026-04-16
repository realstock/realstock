const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mediaId = "18076225190312733"; // Um dos IDs que você postou
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  const metrics = ['impressions', 'reach', 'video_views', 'plays'];
  
  for (const m of metrics) {
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${m}&access_token=${igToken}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`METRICA ${m}:`, JSON.stringify(data, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
