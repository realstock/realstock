
async function scanAdsRecent() {
  const token = "EAASHir4PoI4BRFLR5uDOI8h3nqDCEyR9qSn8R38wH82sNvousoQF3GO48aMELVQ0dllHZCIW4ZA0uSrVSWYFIoizQJsxpyAwylcIpAaDyLe3bRk3YxfvKiKBQ80NO0dTxO8UpZC2y284CeKocXm2sZAgPa55ZADcpYnUXYxJZBL4wsMC8tme2SPchvpPU1kyqQ9gZDZD";
  const adAccountId = "act_1718102826222467";

  console.log(`--- VARREDURA DE ANÚNCIOS ATIVOS ---`);

  const adsRes = await fetch(`https://graph.facebook.com/v19.0/${adAccountId}/ads?fields=id,name,status,effective_status,created_time&limit=20&access_token=${token}`);
  const adsData = await adsRes.json();

  if (!adsData.data) {
    console.error("Erro na API:", adsData);
    return;
  }

  for (const ad of adsData.data) {
    try {
      const insRes = await fetch(`https://graph.facebook.com/v19.0/${ad.id}/insights?fields=impressions,reach,spend&access_token=${token}`);
      const insData = await insRes.json();
      
      if (insData.data && insData.data[0]) {
        const views = parseInt(insData.data[0].impressions || "0");
        console.log(`Ad: ${ad.name} | Status: ${ad.effective_status} | Views: ${views} | Criado em: ${ad.created_time}`);
        
        if (views > 700 && views < 5000) {
          console.log(`\n!!! ALVO ENCONTRADO (FAIXA DOS 800) !!!`);
          console.log(`ID: ${ad.id}\n`);
        }
      } else {
        console.log(`Ad: ${ad.name} | Status: ${ad.effective_status} | Views: 0`);
      }
    } catch (e) {}
  }
}

scanAdsRecent().catch(console.error);
