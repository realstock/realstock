import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPortfolioListingId } from "@/lib/portfolioId";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    const properties = await prisma.property.findMany({
      where: {
        ownerId: user.id,
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!properties || properties.length === 0) {
      return NextResponse.json(
        { success: false, error: "Você ainda não tem anúncios cadastrados" },
        { status: 400 }
      );
    }

    // Buscar o serviço de publicação para YouTube
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
          { name: { contains: "carrossel", mode: "insensitive" } },
          { name: { contains: "portfolio", mode: "insensitive" } },
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

    const portfolioListingId = getPortfolioListingId(user.id);

    // Verificar sessões publicadas de portfólio no YouTube Shorts
    const youtubeSessions = await prisma.youtubeShortsSession.findMany({
      where: {
        listingId: portfolioListingId,
        status: "PUBLISHED"
      },
      orderBy: { createdAt: "desc" }
    });

    const youtubePosts = youtubeSessions.map(session => ({
      postType: "reels", // YouTube Shorts é sempre formato Vídeo/Reels
      validationReport: { permalink: session.permalink || `https://youtube.com/shorts/${session.videoId}` }
    }));

    return NextResponse.json({
      success: true,
      properties,
      youtubePosts,
      portfolioVideoUrl: user.portfolioVideoUrl,
      service: {
        id: service.id,
        name: "Publicação de Portfólio no YouTube Shorts",
        value: Number(service.fee.value),
      }
    });
  } catch (error: any) {
    console.error("GET YOUTUBE PORTFOLIO DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
