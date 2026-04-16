require('dotenv').config();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  
  const userRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
  const userData = await userRes.json();
  const igUserId = userData.instagram_business_account.id;

  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,permalink,like_count&access_token=${igToken}&limit=50`);
  const mediaData = await mediaRes.json();
  
  console.log("LISTA COMPLETA DE MÍDIAS (50):", JSON.stringify(mediaData, null, 2));
}

main();
