import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const offerId = Number(body.offer_id);
    const buyerId = Number(body.buyer_id);

    if (!offerId || !buyerId) {
      return NextResponse.json(
        { success: false, error: "Dados obrigatórios não informados." },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Oferta não encontrada." },
        { status: 404 }
      );
    }

    if (offer.buyerId !== buyerId) {
      return NextResponse.json(
        { success: false, error: "Você não pode cancelar esta oferta." },
        { status: 403 }
      );
    }

    if (offer.status === "accepted") {
      return NextResponse.json(
        {
          success: false,
          error: "Uma oferta aceita não pode ser cancelada pelo comprador.",
        },
        { status: 400 }
      );
    }

    if (offer.status === "cancelled") {
      return NextResponse.json({
        success: true,
        message: "Oferta já estava cancelada.",
      });
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: { status: "cancelled" },
    });

    return NextResponse.json({
      success: true,
      message: "Oferta cancelada com sucesso.",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Não foi possível cancelar a oferta." },
      { status: 500 }
    );
  }
}