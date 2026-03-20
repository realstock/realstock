import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const offerId = Number(body.offer_id);

    if (!offerId) {
      return NextResponse.json(
        { success: false, error: "Oferta não informada." },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.update({
      where: { id: offerId },
      data: { status: "accepted" },
      include: {
        property: {
          include: {
            owner: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      offer,
      sellerContact: {
        user_name: offer.property.owner.userName,
        whatsapp: offer.property.owner.whatsapp,
        instagram: offer.property.owner.instagram,
        email: offer.property.owner.email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Não foi possível aceitar a oferta." },
      { status: 500 }
    );
  }
}