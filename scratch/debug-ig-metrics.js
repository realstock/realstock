const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const mediaId = "18076225190312733"; // O ID que encontramos antes
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (!igToken) {
    console.log("TOKEN NÃO ENCONTRADO NO .ENV");
    return;
  }

  const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,plays,video_views&access_token=${igToken}`;
  const res = await fetch(url);
  const data = await res.json();
  
  console.log("DEBUG INSIGHTS:", JSON.stringify(data, null, 2));
}

main().finally(() => prisma.$disconnect());
