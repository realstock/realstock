require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  
  const userRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
  const userData = await userRes.json();
  const igUserId = userData.instagram_business_account.id;

  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type&access_token=${igToken}&limit=20`);
  const mediaData = await mediaRes.json();
  
  for (const media of mediaData.data) {
    const url = `https://graph.facebook.com/v19.0/${media.id}/insights?metric=impressions,reach&access_token=${igToken}`;
    const res = await fetch(url);
    const data = await res.json();
    
    let imps = 0;
    if (data.data) {
        data.data.forEach(m => { if(m.name === 'impressions') imps = m.values[0].value; });
    }
    console.log(`POST ${media.id} [${media.media_type}]: ${imps} imps - ${media.caption?.substring(0,20)}`);
  }
}

main().finally(() => prisma.$disconnect());
