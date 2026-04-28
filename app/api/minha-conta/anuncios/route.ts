import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido." },
        { status: 401 }
      );
    }

    const properties = await prisma.property.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        offers: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            buyer: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const propertyIds = properties.map((property) => property.id);

    const payments = propertyIds.length
      ? await prisma.offerPayment.findMany({
          where: {
            propertyId: {
              in: propertyIds,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        })
      : [];

    const instagramPosts = await prisma.instagramPreviewSession.findMany({
      where: {
        listingId: {
          in: [...propertyIds, 0],
        },
        status: "PUBLISHED",
      },
    });

    const facebookPosts = await prisma.facebookFeedSession.findMany({
      where: {
        listingId: {
          in: [...propertyIds, 0],
        },
        status: "PUBLISHED",
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { portfolioBoostedUntil: true, googlePortfolioBoostedUntil: true, metaPortfolioBoostedUntil: true },
    });

    return NextResponse.json({
      success: true,
      properties,
      payments,
      instagramPosts,
      facebookPosts,
      portfolioBoostedUntil: user?.portfolioBoostedUntil,
      googlePortfolioBoostedUntil: user?.googlePortfolioBoostedUntil,
      metaPortfolioBoostedUntil: user?.metaPortfolioBoostedUntil,
    });
  } catch (error: any) {
    console.error("MINHA CONTA ANUNCIOS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao buscar anúncios.",
      },
      { status: 500 }
    );
  }
}