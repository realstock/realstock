
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function scanInstagram() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!igToken || !pageId) {
    console.error("Missing tokens/pageId in env");
    return;
  }

  console.log("--- INICIANDO VARREDURA NO INSTAGRAM ---");
  
  // 1. Pegar o Business Account ID
  const pageRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
  const pageData = await pageRes.json();
  const igAccountId = pageData.instagram_business_account?.id;

  if (!igAccountId) {
    console.error("Instagram Business Account not found for page", pageId);
    return;
  }

  console.log(`Buscando posts na conta: ${igAccountId}`);

  // 2. Listar os últimos 50 posts
  const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media?fields=id,media_type,shortcode,permalink,timestamp&limit=50&access_token=${igToken}`);
  const mediaData = await mediaRes.json();

  if (!mediaData.data) {
    console.error("No media found", mediaData);
    return;
  }

  console.log(`Encontrados ${mediaData.data.length} posts. Analisando métricas...`);

  const results = [];

  for (const item of mediaData.data) {
    try {
      // Tentar métricas básicas
      const insRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}/insights?metric=plays,views,impressions&access_token=${igToken}`);
      const insData = await insRes.json();
      
      let views = 0;
      if (insData.data) {
        insData.data.forEach(m => {
          const val = m.values?.[0]?.value || 0;
          if (val > views) views = val;
        });
      }

      // Tentar vídeo insights se for vídeo
      if (item.media_type === 'VIDEO') {
        const vidRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}?fields=video_id&access_token=${igToken}`);
        const vidData = await vidRes.json();
        if (vidData.video_id) {
           const vRes = await fetch(`https://graph.facebook.com/v19.0/${vidData.video_id}?fields=views,play_count,video_play_count&access_token=${igToken}`);
           const vData = await vRes.json();
           const vt = Math.max(vData.views || 0, vData.play_count || 0, vData.video_play_count || 0);
           if (vt > views) views = vt;
        }
      }

      if (views > 0) {
        console.log(`Post ${item.id} (${item.media_type}): ${views} views - ${item.permalink}`);
        if (views > 800) {
          console.log("!!! ENCONTRADO POST COM > 800 VIEWS !!!");
          results.push({ id: item.id, views, permalink: item.permalink });
        }
      }
    } catch (e) {}
  }

  console.log("--- RESULTADOS DA VARREDURA ---");
  console.log(JSON.stringify(results, null, 2));
}

scanInstagram().catch(console.error).finally(() => prisma.$disconnect());
