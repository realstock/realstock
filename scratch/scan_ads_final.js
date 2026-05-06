
async function scanAds() {
  // Usar o token do Instagram que sabemos que funciona e tem permissão de business
  const token = "EAASHir4PoI4BRFLR5uDOI8h3nqDCEyR9qSn8R38wH82sNvousoQF3GO48aMELVQ0dllHZCIW4ZA0uSrVSWYFIoizQJsxpyAwylcIpAaDyLe3bRk3YxfvKiKBQ80NO0dTxO8UpZC2y284CeKocXm2sZAgPa55ZADcpYnUXYxJZBL4wsMC8tme2SPchvpPU1kyqQ9gZDZD";
  const adAccountId = "act_1718102826222467";

  console.log(`--- VARREDURA DE ANÚNCIOS (TOKEN IG) NA CONTA: ${adAccountId} ---`);

  const adsRes = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/ads?fields=id,name,creative{id,object_id,instagram_permalink_url}&limit=50&access_token=${token}`);
  const adsData = await adsRes.json();

  if (!adsData.data) {
    console.error("Erro na API ou conta vazia:", adsData);
    return;
  }

  console.log(`Encontrados ${adsData.data.length} anúncios. Buscando o de 815+ views...`);

  const results = [];

  for (const ad of adsData.data) {
    try {
      const insRes = await fetch(`https://graph.facebook.com/v19.0/${ad.id}/insights?fields=impressions,reach,inline_link_clicks&access_token=${token}`);
      const insData = await insRes.json();
      
      if (insData.data && insData.data[0]) {
        const d = insData.data[0];
        const views = parseInt(d.impressions || "0");
        console.log(`- Ad: ${ad.name} | Views: ${views}`);
        
        if (views > 750) {
          console.log(`\n!!! ENCONTRADO !!!`);
          console.log(`ID do Anúncio: ${ad.id}`);
          console.log(`Nome: ${ad.name}`);
          console.log(`Visualizações: ${views}`);
          console.log(`-------------------\n`);
          results.push({ id: ad.id, views, name: ad.name });
        }
      }
    } catch (e) {}
  }
}

scanAds().catch(console.error);
