require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = ["18089305223227888", "18517777516078516", "18076225190312733", "18133585780533620"];
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  if (!igToken) { console.log("TOKEN NÃO CARREGADO"); return; }

  for (const mediaId of ids) {
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,video_views,plays&access_token=${igToken}`;
    const res = await fetch(url);
    const data = await res.json();
    
    let stats = {};
    if (data.data) {
        data.data.forEach(m => stats[m.name] = m.values[0].value);
    }
    console.log(`ID ${mediaId}: imps=${stats.impressions || 0}, plays=${stats.plays || 0}, video_views=${stats.video_views || 0}`);
  }
}

main().finally(() => prisma.$disconnect());
