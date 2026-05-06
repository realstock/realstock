
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function scanAds() {
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  let adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;

  if (!pageToken || !adAccountId) {
    console.error("Missing tokens/adAccountId in env");
    return;
  }

  // Limpar prefixo act_ se já existir para não duplicar
  const cleanId = adAccountId.replace('act_', '');
  const fullId = `act_${cleanId}`;

  console.log(`--- INICIANDO VARREDURA DE ANÚNCIOS NA CONTA: ${fullId} ---`);

  const adsRes = await fetch(`https://graph.facebook.com/v19.0/${fullId}/ads?fields=id,name,creative{id,object_id,instagram_permalink_url}&limit=50&access_token=${pageToken}`);
  const adsData = await adsRes.json();

  if (!adsData.data) {
    console.error("No ads found", adsData);
    return;
  }

  console.log(`Encontrados ${adsData.data.length} anúncios. Analisando métricas...`);

  const results = [];

  for (const ad of adsData.data) {
    try {
      const insRes = await fetch(`https://graph.facebook.com/v19.0/${ad.id}/insights?fields=impressions,reach,inline_link_clicks&access_token=${pageToken}`);
      const insData = await insRes.json();
      
      if (insData.data && insData.data[0]) {
        const d = insData.data[0];
        const views = parseInt(d.impressions || "0");
        const reach = parseInt(d.reach || "0");
        
        console.log(`Ad ${ad.id} (${ad.name}): ${views} impressions`);
        
        if (views > 700) {
          console.log(`!!! ENCONTRADO !!! Ad ID: ${ad.id} tem ${views} views.`);
          results.push({ adId: ad.id, views });
        }
      }
    } catch (e) {}
  }

  console.log("--- RESULTADOS FINAIS ---");
  console.log(JSON.stringify(results, null, 2));
}

scanAds().catch(console.error).finally(() => prisma.$disconnect());
