import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
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

    const offers = await prisma.offer.findMany({
      where: {
        buyerId: userId,
      },
      include: {
        property: {
          include: {
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      offers,
    });
  } catch (error: any) {
    console.error("MINHA CONTA OFERTAS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao buscar ofertas.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
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

    const body = await req.json();
    const action = String(body.action || "").trim();
    const offerId = Number(body.offer_id);

    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json(
        { success: false, error: "offer_id inválido." },
        { status: 400 }
      );
    }

    if (action === "accept") {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: {
          property: true,
        },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Oferta não encontrada." },
          { status: 404 }
        );
      }

      if (offer.property.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para aceitar esta oferta." },
          { status: 403 }
        );
      }

      if (String(offer.status).toLowerCase() !== "open") {
        return NextResponse.json(
          { success: false, error: "Apenas ofertas abertas podem ser aceitas." },
          { status: 400 }
        );
      }

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "accepted",
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
      });
    }

    if (action === "cancel") {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Oferta não encontrada." },
          { status: 404 }
        );
      }

      if (offer.buyerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para cancelar esta oferta." },
          { status: 403 }
        );
      }

      if (String(offer.status).toLowerCase() !== "open") {
        return NextResponse.json(
          { success: false, error: "Apenas ofertas abertas podem ser canceladas." },
          { status: 400 }
        );
      }

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "cancelled",
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
      });
    }

    return NextResponse.json(
      { success: false, error: "Ação inválida." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("MINHA CONTA OFERTAS POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao processar oferta.",
      },
      { status: 500 }
    );
  }
}