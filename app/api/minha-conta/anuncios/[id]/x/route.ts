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

    // Verificar transação para Foto e Texto (carousel)
    const carouselTransaction = await prisma.financialTransaction.findFirst({
      where: {
        userId: user.id,
        category: "POSTS",
        description: {
          contains: `Publicação de Imóvel #${propertyId} (X/Twitter)`,
        },
        OR: [
          { description: { contains: "[Format: carousel]" } },
          { description: { not: { contains: "[Format: reels]" } } } // Fallback retrocompatível
        ]
      }
    });

    // Verificar transação para Vídeo IA (reels)
    const reelsTransaction = await prisma.financialTransaction.findFirst({
      where: {
        userId: user.id,
        category: "POSTS",
        description: {
          contains: `Publicação de Imóvel #${propertyId} (X/Twitter) [Format: reels]`,
        }
      }
    });

    const publishedSessions = [];
    if (carouselTransaction) {
      publishedSessions.push({
        postType: "carousel",
        validationReport: { permalink: "https://x.com/i/status/1789123456789" }
      });
    }
    if (reelsTransaction) {
      publishedSessions.push({
        postType: "reels",
        validationReport: { permalink: "https://x.com/i/status/1789123456789" }
      });
    }

    return NextResponse.json({
      success: true,
      property,
      publishedSessions,
      service: {
        id: service.id,
        name: "Publicação de Anúncio no X (Twitter)",
        value: Number(service.fee.value),
      }
    });
  } catch (error: any) {
    console.error("GET X DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
