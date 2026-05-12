const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProperties() {
  const ids = [16, 41];
  const properties = await prisma.property.findMany({
    where: { id: { in: ids } },
    include: {
      images: { take: 1 },
    }
  });

  console.log("=== DIAGNÓSTICO DE MÉTRICAS ===");
  properties.forEach(p => {
    console.log(`\nImóvel #${p.id}: ${p.title}`);
    console.log(`- Meta Ad ID: ${p.metaAdId || 'NÃO ENCONTRADO'}`);
    console.log(`- Meta Campaign ID: ${p.metaCampaignId || 'NÃO ENCONTRADO'}`);
    console.log(`- Instagram Media ID: ${p.instagramMediaId || 'NÃO ENCONTRADO'}`);
    console.log(`- Instagram Permalink: ${p.instagramPermalink || 'NÃO ENCONTRADO'}`);
    console.log(`- Reels Video URL: ${p.reelsVideoUrl ? 'SIM' : 'NÃO'}`);
  });

  const adSessions = await prisma.metaAdsSession.findMany({
    where: { listingId: { in: ids } }
  });

  console.log("\n=== SESSÕES DE IMPULSIONAMENTO (META ADS) ===");
  if (adSessions.length === 0) {
    console.log("Nenhuma sessão de Meta Ads encontrada para estes imóveis.");
  } else {
    adSessions.forEach(s => {
      console.log(`- Sessão ID: ${s.id} | Imóvel: ${s.listingId} | Campaign: ${s.campaignId} | Status: ${s.status}`);
    });
  }

  const igSessions = await prisma.instagramPreviewSession.findMany({
    where: { listingId: { in: ids } }
  });

  console.log("\n=== SESSÕES DE POSTAGEM (INSTAGRAM) ===");
  if (igSessions.length === 0) {
    console.log("Nenhuma sessão de postagem encontrada.");
  } else {
    igSessions.forEach(s => {
      console.log(`- Sessão ID: ${s.id} | Imóvel: ${s.listingId} | Media ID: ${s.publishedMediaId} | Status: ${s.status}`);
    });
  }
}

checkProperties()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
