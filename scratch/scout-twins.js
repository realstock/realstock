const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ids = ["18089305223227888", "18517777516078516", "18076225190312733", "18133585780533620"];
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  for (const mediaId of ids) {
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,video_views,plays&access_token=${igToken}`;
    const res = await fetch(url);
    const data = await res.json();
    
    let total = 0;
    if (data.data) {
        for (const m of data.data) {
            if (m.name === 'impressions' || m.name === 'video_views' || m.name === 'plays') {
                total = m.values[0].value;
                if (total > 0) break;
            }
        }
    }
    console.log(`ID ${mediaId}: ${total} views`);
  }
}

main().finally(() => prisma.$disconnect());
