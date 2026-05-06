
async function testNewMetrics() {
  const token = "EAASHir4PoI4BRFLR5uDOI8h3nqDCEyR9qSn8R38wH82sNvousoQF3GO48aMELVQ0dllHZCIW4ZA0uSrVSWYFIoizQJsxpyAwylcIpAaDyLe3bRk3YxfvKiKBQ80NO0dTxO8UpZC2y284CeKocXm2sZAgPa55ZADcpYnUXYxJZBL4wsMC8tme2SPchvpPU1kyqQ9gZDZD";
  const carouselId = "18041196029583643";

  console.log(`--- TESTANDO NOVAS MÉTRICAS (VIEWS): ${carouselId} ---`);

  // Usar 'views' em vez de 'impressions'
  const metrics = 'views,reach,total_interactions';
  const insRes = await fetch(`https://graph.facebook.com/v19.0/${carouselId}/insights?metric=${metrics}&access_token=${token}`);
  const insData = await insRes.json();
  console.log('Insights Data:', JSON.stringify(insData, null, 2));
}

testNewMetrics().catch(console.error);
