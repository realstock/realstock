import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    // O serviço será "post de carroussel"
    const service = await prisma.siteService.findFirst({
      where: {
        OR: [
          { name: { contains: "postar carroussel dos anuncios do usuario", mode: "insensitive" } },
          { name: { contains: "post de carroussel", mode: "insensitive" } },
          { name: { contains: "carrossel", mode: "insensitive" } },
          { name: { contains: "carousel", mode: "insensitive" } },
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

    const xPosts = [
      {
        listingId: 0,
        postType: "carousel",
        validationReport: { permalink: "https://x.com/realstock/status/1789123456789" }
      }
    ].slice(0, 0); // Vazio por padrão

    return NextResponse.json({
      success: true,
      properties,
      xPosts,
      portfolioVideoUrl: user.portfolioVideoUrl,
      service: {
        id: service.id,
        name: service.name + " (Portfólio Completo)",
        value: Number(service.fee.value),
      }
    });
  } catch (error: any) {
    console.error("GET X PORTFOLIO DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
