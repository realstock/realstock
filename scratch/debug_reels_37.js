
async function debugReels37() {
  const token = "EAASHir4PoI4BRFLR5uDOI8h3nqDCEyR9qSn8R38wH82sNvousoQF3GO48aMELVQ0dllHZCIW4ZA0uSrVSWYFIoizQJsxpyAwylcIpAaDyLe3bRk3YxfvKiKBQ80NO0dTxO8UpZC2y284CeKocXm2sZAgPa55ZADcpYnUXYxJZBL4wsMC8tme2SPchvpPU1kyqQ9gZDZD";
  const mediaId = "17859991122593937";

  console.log(`--- DEBUG REELS 37: ${mediaId} ---`);

  // 1. Verificar se o ID é válido e o tipo
  const baseRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=id,media_type,video_id&access_token=${token}`);
  const baseData = await baseRes.json();
  console.log('Base Data:', JSON.stringify(baseData, null, 2));

  // 2. Tentar todas as métricas possíveis de visualização
  const metrics = 'plays,views,reach,total_interactions';
  const insRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}/insights?metric=${metrics}&access_token=${token}`);
  const insData = await insRes.json();
  console.log('Insights Data:', JSON.stringify(insData, null, 2));
}

debugReels37().catch(console.error);
