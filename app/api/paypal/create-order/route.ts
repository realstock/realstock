import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getPayPalAccessToken() {
  const base = process.env.PAYPAL_API_BASE!;
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("PAYPAL TOKEN RESPONSE:", data);
    throw new Error(
      data.error_description || data.error || "Falha ao autenticar no PayPal."
    );
  }

  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const offerId = Number(body.offer_id);

    if (!offerId) {
      return NextResponse.json(
        { success: false, error: "offer_id não informado." },
        { status: 400 }
      );
    }

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

    if (offer.status !== "accepted" && offer.status !== "open" && offer.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "A oferta precisa estar aberta ou aceita." },
        { status: 400 }
      );
    }

    const property = offer.property;
    const propertyPrice = Number(property.price || 0);
    const acceptedOfferValue = Number(offer.offerPrice || 0);

    if (property.contactFeePaidAt) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          status: "accepted",
          hostFeePaidAt: property.contactFeePaidAt,
        },
      });

      return NextResponse.json({
        success: true,
        already_paid: true,
        message: "Os contatos deste imóvel já foram liberados por um pagamento anterior."
      });
    }

    let paymentAmount = 0;
    if (property.listingType === "ALUGUEL_TEMPORADA") {
      const siteService = await prisma.siteService.findFirst({
        where: { slug: "aluguel-temporada" },
        include: { fee: true }
      });
      paymentAmount = siteService?.fee?.value ? Number(siteService.fee.value) : 10.00;
    } else {
      // 0,01% do valor do anúncio (property.price)
      const baseValueForFee = propertyPrice > 0 ? propertyPrice : (acceptedOfferValue > 0 ? acceptedOfferValue : 0);

      const siteService = await prisma.siteService.findFirst({
        where: { slug: { in: ["oferta", "compra-venda", "taxa-oferta"] }, isActive: true },
        include: { fee: true },
      });

      let feePct = 0.01; // padrão 0,01%
      if (siteService?.fee && siteService.fee.isActive && siteService.fee.type === "PERCENTAGE") {
        feePct = Number(siteService.fee.value);
      }

      paymentAmount = Number(((baseValueForFee * feePct) / 100).toFixed(2));

      if (paymentAmount <= 0) {
        paymentAmount = 1.00;
      }
    }

    let payment = await prisma.offerPayment.findFirst({
      where: { offerId: offer.id },
    });

    if (!payment) {
      payment = await prisma.offerPayment.create({
        data: {
          offerId: offer.id,
          propertyId: property.id,
          buyerId: offer.buyerId,
          sellerId: property.ownerId,
          acceptedOfferValue,
          paymentAmount,
          paymentStatus: "pending",
          contactReleased: false,
        },
      });
    }

    if (payment.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        already_paid: true,
        paypal_order_id: payment.paypalOrderId,
        payment_id: payment.id,
        payment_amount: paymentAmount,
      });
    }

    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: String(payment.id),
            amount: {
              currency_code: "BRL",
              value: paymentAmount.toFixed(2),
            },
            description: `RealStock fee - offer ${offer.id} property ${property.id}`,
          },
        ],
        application_context: {
          user_action: "PAY_NOW",
        },
      }),
    });

    const order = await orderRes.json();

    console.log("PAYPAL ORDER RESPONSE:", order);

    if (!orderRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: order.message || "Erro ao criar ordem PayPal.",
          detail: order,
        },
        { status: 400 }
      );
    }

    await prisma.offerPayment.update({
      where: { id: payment.id },
      data: {
        paypalOrderId: order.id,
      },
    });

    return NextResponse.json({
      success: true,
      paypal_order_id: order.id,
      payment_id: payment.id,
      payment_amount: paymentAmount,
    });
  } catch (error: any) {
    console.error("PAYPAL CREATE ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao criar ordem PayPal.",
      },
      { status: 500 }
    );
  }
}