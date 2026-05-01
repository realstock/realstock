const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetVideo() {
  const propertyId = 38;
  try {
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        reelsVideoUrl: null,
        reelsVideoPaidAt: null
      }
    });
    console.log(`Sucesso: Vídeo do imóvel ${propertyId} resetado.`);
    console.log('Novo estado:', { reelsVideoUrl: updated.reelsVideoUrl, reelsVideoPaidAt: updated.reelsVideoPaidAt });
  } catch (error) {
    console.error('Erro ao resetar vídeo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetVideo();
