import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const offerId = Number(body.offer_id);
    const buyerId = Number(body.buyer_id);

    if (!offerId || !buyerId) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos." },
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
        { success: false, error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    if (offer.status !== "open") {
      return NextResponse.json(
        { success: false, error: "Oferta não pode ser cancelada." },
        { status: 400 }
      );
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: "cancelled",
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("CANCEL OFFER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao cancelar oferta.",
      },
      { status: 500 }
    );
  }
}