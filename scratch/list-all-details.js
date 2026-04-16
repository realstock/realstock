const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const userRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
  const userData = await userRes.json();
  const igUserId = userData.instagram_business_account?.id;

  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,permalink,thumbnail_url&access_token=${igToken}`);
  const mediaData = await mediaRes.json();
  
  console.log("TODAS AS MIDIAS COM DETALHES:", JSON.stringify(mediaData, null, 2));
}

main().finally(() => prisma.$disconnect());
