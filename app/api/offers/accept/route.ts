import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const offerId = Number(body.offer_id);

    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json(
        { success: false, error: "offer_id inválido." },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        buyer: true,
      },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Oferta não encontrada." },
        { status: 404 }
      );
    }

    if (String(offer.status).toLowerCase() !== "open") {
      return NextResponse.json(
        {
          success: false,
          error: "Apenas ofertas em aberto podem ser aceitas.",
        },
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
      sellerContact: {
        name: offer.property.owner.name,
        phone: offer.property.owner.phone,
        instagram: offer.property.owner.instagram,
        email: offer.property.owner.email,
      },
    });
  } catch (error: any) {
    console.error("OFFERS ACCEPT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao aceitar oferta.",
      },
      { status: 500 }
    );
  }
}