const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBoostLogic() {
  console.log("--- TESTANDO LÓGICA DE TURBINAR POST ORGÂNICO ---\n");

  // 1. Buscar um imóvel que tenha sessão publicada para teste
  const igSession = await prisma.instagramPreviewSession.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" }
  });

  const fbSession = await prisma.facebookFeedSession.findFirst({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" }
  });

  if (!igSession && !fbSession) {
    console.log("Nenhuma sessão publicada encontrada no banco de dados.");
    console.log("Simulando comportamento com dados fictícios...\n");
    
    const mockPropertyId = 123;
    const mockIgMediaId = "INSTAGRAM_123456789";
    
    console.log(`Cenário: Imóvel #${mockPropertyId} publicado no Instagram com ID: ${mockIgMediaId}`);
    runSimulation(mockPropertyId, { ig: mockIgMediaId, fb: null });
  } else {
    if (igSession) {
      console.log(`Sessão IG encontrada: Imóvel #${igSession.listingId}, MediaID: ${igSession.publishedMediaId}`);
      runSimulation(igSession.listingId, { ig: igSession.publishedMediaId, fb: fbSession?.publishedPostId });
    } else if (fbSession) {
      console.log(`Sessão FB encontrada: Imóvel #${fbSession.listingId}, PostID: ${fbSession.publishedPostId}`);
      runSimulation(fbSession.listingId, { ig: null, fb: fbSession.publishedPostId });
    }
  }
}

function runSimulation(propertyId, sessions) {
  console.log("\nExecutando Simulação da Rota 'capture-boost-order'...");
  
  // Lógica extraída de app/api/paypal/capture-boost-order/route.ts
  let sourceId = null;
  let platform = "meta"; // Simulando escolha do usuário

  // Busca simulada (substituindo consulta ao DB pelos dados passados)
  const igId = sessions.ig;
  const fbId = sessions.fb;

  if (platform === "meta") {
    if (igId) {
      sourceId = igId;
      console.log(`[LOG] Post orgânico do Instagram detectado: ${sourceId}`);
    } else if (fbId) {
      sourceId = fbId;
      console.log(`[LOG] Post orgânico do Facebook detectado: ${sourceId}`);
    } else {
      sourceId = `Prop_${propertyId}`;
      console.log(`[LOG] Nenhum post orgânico encontrado. Usando modo 'Dark Post' para Imóvel ${propertyId}`);
    }
  }

  console.log(`\nRESULTADO FINAL:`);
  console.log(`ID que será enviado para a Meta Ads: ${sourceId}`);
  
  if (!sourceId.startsWith("Prop_")) {
    console.log("VERIFICAÇÃO: ✅ SUCESSO. O anúncio será vinculado ao POST ORGÂNICO EXISTENTE.");
    console.log("IMPACTO NOS INSIGHTS: Como o 'source_instagram_media_id' ou 'object_story_id' está sendo usado,");
    console.log("todas as visualizações, curtidas e comentários do anúncio aparecerão diretamente no post original.");
  } else {
    console.log("VERIFICAÇÃO: ⚠️ AVISO. Usando Dark Post porque não há link orgânico disponível.");
  }
}

testBoostLogic()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
