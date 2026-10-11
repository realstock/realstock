import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

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
        property: true,
        buyer: true,
      },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Reserva não encontrada." },
        { status: 404 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser || currentUser.id !== offer.buyerId) {
      return NextResponse.json(
        { success: false, error: "Apenas o usuário que reservou o imóvel pode efetuar este pagamento." },
        { status: 403 }
      );
    }

    const property = offer.property;
    if (property.listingType !== "ALUGUEL_TEMPORADA") {
      return NextResponse.json(
        { success: false, error: "Este imóvel não é de aluguel por temporada." },
        { status: 400 }
      );
    }

    if (!property.acceptsPaypal || !property.paypalEmail) {
      return NextResponse.json(
        { success: false, error: "O anfitrião não configurou recebimento via PayPal para este imóvel." },
        { status: 400 }
      );
    }

    if (offer.status === "RESERVA_CONFIRMADA") {
      return NextResponse.json({
        success: true,
        already_paid: true,
        message: "Esta reserva já está confirmada e paga.",
      });
    }

    const totalStay = Number(offer.totalStayPrice || offer.offerPrice || 0);
    const depositPct = property.depositPercentage ? Number(property.depositPercentage) : 20;
    const calculatedDeposit = offer.depositAmount
      ? Number(offer.depositAmount)
      : Number(((totalStay * depositPct) / 100).toFixed(2));

    const paymentAmount = Math.max(calculatedDeposit, 1.00);

    let payment = await prisma.offerPayment.findFirst({
      where: {
        offerId: offer.id,
        buyerId: offer.buyerId,
      },
    });

    if (!payment) {
      payment = await prisma.offerPayment.create({
        data: {
          offerId: offer.id,
          propertyId: property.id,
          buyerId: offer.buyerId,
          sellerId: property.ownerId,
          acceptedOfferValue: totalStay,
          paymentAmount,
          paymentStatus: "pending",
          contactReleased: false,
        },
      });
    } else {
      await prisma.offerPayment.update({
        where: { id: payment.id },
        data: {
          paymentAmount,
          acceptedOfferValue: totalStay,
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

    // Direct payment to host: payee.email_address routes funds straight to the host's account
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
            reference_id: `res_dep_${offer.id}_${payment.id}`,
            description: `Sinal da Reserva #${offer.id} - ${property.title.substring(0, 80)}`,
            amount: {
              currency_code: "BRL",
              value: paymentAmount.toFixed(2),
            },
            payee: {
              email_address: property.paypalEmail.trim(),
            },
          },
        ],
        application_context: {
          user_action: "PAY_NOW",
          brand_name: "RealStock",
          return_url: `${process.env.NEXTAUTH_URL || "https://www.realstock.com.br"}/minha-conta/ofertas?tab=VIAJANDO&categoria=TEMPORADA`,
          cancel_url: `${process.env.NEXTAUTH_URL || "https://www.realstock.com.br"}/minha-conta/ofertas?tab=VIAJANDO&categoria=TEMPORADA`,
        },
      }),
    });

    const order = await orderRes.json();
    console.log("PAYPAL RESERVATION ORDER RESPONSE:", order);

    if (!orderRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: order.message || "Erro ao criar ordem no PayPal direcionada ao anfitrião.",
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
    console.error("PAYPAL CREATE RESERVATION ORDER ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao criar ordem de pagamento da reserva via PayPal.",
      },
      { status: 500 }
    );
  }
}
