import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const paymentId = Number(searchParams.get("payment_id"));
    const sellerId = Number(searchParams.get("seller_id"));

    if (!paymentId || Number.isNaN(paymentId)) {
      return NextResponse.json(
        { success: false, error: "payment_id inválido." },
        { status: 400 }
      );
    }

    if (!sellerId || Number.isNaN(sellerId)) {
      return NextResponse.json(
        { success: false, error: "seller_id inválido." },
        { status: 400 }
      );
    }

    const payment = await prisma.offerPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Pagamento não encontrado." },
        { status: 404 }
      );
    }

    if (payment.sellerId !== sellerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Você não tem permissão para ver este contato.",
        },
        { status: 403 }
      );
    }

    if (payment.paymentStatus !== "paid") {
      return NextResponse.json(
        { success: false, error: "Pagamento ainda não foi confirmado." },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: payment.offerId },
      include: {
        buyer: true,
        property: true,
      },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Oferta não encontrada." },
        { status: 404 }
      );
    }

    const buyer = offer.buyer;

    if (!buyer) {
      return NextResponse.json(
        { success: false, error: "Comprador não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      buyer: {
        id: buyer.id,
        name: buyer.name,
        email: buyer.email,
        phone: buyer.phone,
        instagram: buyer.instagram,
        cpfCnpj: buyer.cpfCnpj,
        country: buyer.country,
        state: buyer.state,
        city: buyer.city,
        paypalEmail: buyer.paypalEmail,
      },
    });
  } catch (error: any) {
    console.error("COMPRADOR LIBERADO ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar contato do comprador.",
      },
      { status: 500 }
    );
  }
}