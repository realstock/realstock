const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const userRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
  const userData = await userRes.json();
  const igUserId = userData.instagram_business_account?.id;

  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,permalink&access_token=${igToken}`);
  const mediaData = await mediaRes.json();
  
  for (const media of mediaData.data) {
    const url = `https://graph.facebook.com/v19.0/${media.id}/insights?metric=impressions,reach,video_views,plays&access_token=${igToken}`;
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
    
    console.log(`POST ${media.id} [${media.media_type}]: ${total} views/imps - ${media.permalink}`);
  }
}

main().finally(() => prisma.$disconnect());
