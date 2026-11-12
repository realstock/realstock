import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getYoutubeConnectionStatus } from "@/lib/youtube";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const propertyId = Number(resolvedParams.id);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ownerId: user.id,
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Anúncio não encontrado ou sem permissão" },
        { status: 404 }
      );
    }

    // Buscar o serviço de publicação
    const service = await prisma.siteService.findFirst({
      where: {
        name: { contains: "YouTube Shorts", mode: "insensitive" }
      },
      include: {
        fee: true
      }
    }) || await prisma.siteService.findFirst({
      where: {
        OR: [
          { name: { contains: "Post de Anuncio", mode: "insensitive" } },
          { name: { contains: "publicação de anuncio", mode: "insensitive" } },
        ]
      },
      include: {
        fee: true
      }
    });

    if (!service || !service.fee) {
       return NextResponse.json(
        { success: false, error: "Serviço de publicação não configurado no painel." },
        { status: 400 }
      );
    }

    // Verificar conexão com o canal do YouTube
    const youtubeStatus = await getYoutubeConnectionStatus(user.id);

    // Verificar sessões publicadas (filtrando mocks)
    const youtubeSessions = await prisma.youtubeShortsSession.findMany({
      where: {
        listingId: propertyId,
        status: "PUBLISHED"
      },
      orderBy: { createdAt: "desc" }
    });

    const realSessions = youtubeSessions.filter(
      session => session.videoId && !session.videoId.startsWith("mock_")
    );

    const publishedSessions = realSessions.map(session => ({
      postType: "reels",
      validationReport: { permalink: session.permalink || `https://youtube.com/shorts/${session.videoId}` }
    }));

    const hasMockSession = youtubeSessions.some(
      session => session.videoId && session.videoId.startsWith("mock_")
    );

    const isEligibleForDirectPublish = Boolean(
      property.reelsVideoPaidAt || 
      (property.boostedUntil && new Date(property.boostedUntil) > new Date()) || 
      hasMockSession ||
      user.role === "ADMIN"
    );

    return NextResponse.json({
      success: true,
      property,
      publishedSessions,
      isYoutubeConnected: youtubeStatus.isConnected,
      channelTitle: youtubeStatus.channelTitle,
      hasMockSession,
      isEligibleForDirectPublish,
      service: {
        id: service.id,
        name: "Publicação de Anúncio no YouTube Shorts",
        value: Number(service.fee.value),
      }
    });
  } catch (error: any) {
    console.error("GET YOUTUBE DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
