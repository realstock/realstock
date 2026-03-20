import { NextResponse } from "next/server";
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

export async function POST(req: Request) {
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

    if (offer.status !== "accepted") {
      return NextResponse.json(
        { success: false, error: "A oferta precisa estar aceita." },
        { status: 400 }
      );
    }

    const property = offer.property;
    const acceptedOfferValue = Number(offer.offerPrice);
    const paymentAmount = Number(((2 * acceptedOfferValue) / 10000).toFixed(2));

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