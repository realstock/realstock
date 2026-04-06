import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);
    const params = await context.params;
    const propertyId = Number(params.id);

    if (!propertyId || Number.isNaN(propertyId)) {
      return NextResponse.json(
        { success: false, error: "Imóvel inválido." },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Imóvel não encontrado." },
        { status: 404 }
      );
    }

    if (property.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Sem permissão para acessar este imóvel." },
        { status: 403 }
      );
    }

    const offers = await prisma.offer.findMany({
      where: { propertyId },
      include: {
        buyer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const offerIds = offers.map((offer) => offer.id);

    const payments = offerIds.length
      ? await prisma.offerPayment.findMany({
          where: {
            offerId: {
              in: offerIds,
            },
          },
        })
      : [];

    const paymentsMap = new Map(payments.map((payment) => [payment.offerId, payment]));

    const safeOffers = offers.map((offer, index) => {
      const payment = paymentsMap.get(offer.id);
      const contactReleased = Boolean(payment?.contactReleased);

      return {
        id: offer.id,
        offerPrice: Number(offer.offerPrice),
        status: offer.status,
        createdAt: offer.createdAt.toISOString(),
        contactReleased,
        buyer: contactReleased
          ? {
              name: offer.buyer?.name || null,
              email: offer.buyer?.email || null,
              phone: offer.buyer?.phone || null,
              instagram: offer.buyer?.instagram || null,
            }
          : {
              name: `Comprador ${index + 1}`,
              email: null,
              phone: null,
              instagram: null,
            },
      };
    });

    return NextResponse.json({
      success: true,
      property: {
        id: property.id,
        title: property.title,
        city: property.city,
        state: property.state,
        neighborhood: property.neighborhood,
      },
      offers: safeOffers,
    });
  } catch (error: any) {
    console.error("ANUNCIO OFERTAS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar ofertas do imóvel.",
      },
      { status: 500 }
    );
  }
}