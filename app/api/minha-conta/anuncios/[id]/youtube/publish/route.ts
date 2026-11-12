import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadYoutubeShort } from "@/lib/youtube";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const propertyId = Number(resolvedParams.id);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
      },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Anúncio não encontrado ou sem permissão" }, { status: 404 });
    }

    const videoUrl = property.customVideoUrl || property.reelsVideoUrl;
    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: "Este anúncio ainda não possui um vídeo gerado para publicação no YouTube Shorts." },
        { status: 400 }
      );
    }

    const isSeasonal = property.listingType === "ALUGUEL_TEMPORADA";
    const propertyUrl = `https://www.realstock.com.br/imovel/${property.id}`;
    const descStr = property.description ? ` - ${property.description}` : "";

    const videoTitle = isSeasonal
      ? "Procurando lugar para se hospedar? Conheça este espaço!"
      : property.title.substring(0, 70);

    const videoDescription = isSeasonal
      ? `Pensando em viajar para ${property.city || ''} reserve este imovel no ${propertyUrl}${descStr}`
      : `${property.title}\n\n📍 ${[property.city, property.state].filter(Boolean).join(" - ")}\n💰 R$ ${Number(property.price).toLocaleString("pt-BR")}\n\n${property.description || ""}`;

    const tags = isSeasonal
      ? ["Shorts", "RealStock", "AluguelTemporada", "Temporada", property.city || "Brasil"].filter(Boolean)
      : ["Shorts", "RealStock", "Imoveis", property.city || "Brasil"].filter(Boolean);

    console.log(`[YouTube Publish] Iniciando upload para imóvel #${propertyId}...`);
    const uploadResult = await uploadYoutubeShort({
      userId: user.id,
      videoUrl,
      title: videoTitle,
      description: videoDescription,
      tags,
    });

    if (!uploadResult.success || !uploadResult.videoId) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || "Falha no upload para o YouTube Shorts." },
        { status: 400 }
      );
    }

    // Remove sessões simuladas prévias (mocks) deste anúncio
    try {
      await prisma.youtubeShortsSession.deleteMany({
        where: {
          listingId: propertyId,
          videoId: { startsWith: "mock_" },
        },
      });
    } catch (cleanupErr) {
      console.warn("[YouTube Publish] Aviso ao limpar sessões mock:", cleanupErr);
    }

    // Registra sessão real no banco
    const sessionRecord = await prisma.youtubeShortsSession.create({
      data: {
        listingId: propertyId,
        videoId: uploadResult.videoId,
        permalink: uploadResult.permalink,
        status: "PUBLISHED",
        caption: videoDescription,
      },
    });

    // Atualiza flag de pagamento do vídeo no anúncio se necessário
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        reelsVideoPaidAt: property.reelsVideoPaidAt || new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      session: sessionRecord,
      permalink: uploadResult.permalink,
      videoId: uploadResult.videoId,
    });
  } catch (error: any) {
    console.error("[YouTube Publish] Erro na rota de publicação:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}
