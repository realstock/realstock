
async function debugCarousel() {
  const token = "EAASHir4PoI4BRFLR5uDOI8h3nqDCEyR9qSn8R38wH82sNvousoQF3GO48aMELVQ0dllHZCIW4ZA0uSrVSWYFIoizQJsxpyAwylcIpAaDyLe3bRk3YxfvKiKBQ80NO0dTxO8UpZC2y284CeKocXm2sZAgPa55ZADcpYnUXYxJZBL4wsMC8tme2SPchvpPU1kyqQ9gZDZD";
  const carouselId = "18041196029583643";

  console.log(`--- DEBUG CARROSSEL: ${carouselId} ---`);

  // 1. Campos base
  const baseRes = await fetch(`https://graph.facebook.com/v19.0/${carouselId}?fields=id,media_type,like_count,comments_count,view_count&access_token=${token}`);
  const baseData = await baseRes.json();
  console.log('Base Data:', JSON.stringify(baseData, null, 2));

  // 2. Todas as métricas possíveis
  const metrics = 'impressions,reach,carousel_album_impressions,carousel_album_reach,carousel_album_engagement,saved,total_interactions';
  const insRes = await fetch(`https://graph.facebook.com/v19.0/${carouselId}/insights?metric=${metrics}&access_token=${token}`);
  const insData = await insRes.json();
  console.log('Insights Data:', JSON.stringify(insData, null, 2));
}

debugCarousel().catch(console.error);
