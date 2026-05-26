import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // Verificar sessões publicadas
    const youtubeSessions = await prisma.youtubeShortsSession.findMany({
      where: {
        listingId: propertyId,
        status: "PUBLISHED"
      },
      orderBy: { createdAt: "desc" }
    });

    const publishedSessions = youtubeSessions.map(session => ({
      postType: "reels", // YouTube Shorts é sempre formato Reels/Vídeo
      validationReport: { permalink: session.permalink || `https://youtube.com/shorts/${session.videoId}` }
    }));

    return NextResponse.json({
      success: true,
      property,
      publishedSessions,
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
