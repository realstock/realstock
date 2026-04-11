import { NextRequest, NextResponse } from "next/server";
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
          take: 1, // Only 1 photo per property needed for the portfolio carousel
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      // Removed take 10
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

    return NextResponse.json({
      success: true,
      properties,
      service: {
        id: service.id,
        name: service.name + " (Portfólio Completo)",
        value: Number(service.fee.value),
      }
    });
  } catch (error: any) {
    console.error("GET INSTAGRAM PORTFOLIO DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
