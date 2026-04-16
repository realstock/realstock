require('dotenv').config();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  const targetPermalinkSuffix = "DXKQ0zZD6le";
  
  const userRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
  const userData = await userRes.json();
  const igUserId = userData.instagram_business_account.id;

  let url = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,caption,media_type,permalink&access_token=${igToken}&limit=50`;
  
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.data) break;
    
    const match = data.data.find(m => m.permalink.includes(targetPermalinkSuffix));
    if (match) {
      console.log("ACHEI!", JSON.stringify(match, null, 2));
      // Pegar insights dele
      const iRes = await fetch(`https://graph.facebook.com/v19.0/${match.id}/insights?metric=impressions,reach,video_views,plays&access_token=${igToken}`);
      const iData = await iRes.json();
      console.log("INSIGHTS REAIS:", JSON.stringify(iData, null, 2));
      return;
    }
    
    if (!data.paging?.next) break;
    url = data.paging.next;
  }
  console.log("NÃO ENCONTRADO NAS ÚLTIMAS 250 MÍDIAS");
}

main();
