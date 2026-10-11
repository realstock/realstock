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
    const isFullBalance = Boolean(body.is_full_balance ?? true);
    const rawCustomAmount = body.custom_amount !== undefined && body.custom_amount !== null
      ? Number(body.custom_amount)
      : null;

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
        { success: false, error: "Apenas o locatário responsável pode pagar o saldo desta reserva." },
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

    if (offer.status === "CHECKIN_LIBERADO" || offer.checkInReleasedAt) {
      return NextResponse.json({
        success: false,
        error: "O saldo desta reserva já foi quitado e o check-in já está liberado.",
      });
    }

    // Calculate totals and current remaining balance
    const totalStay = Number(offer.totalStayPrice || offer.offerPrice || 0);
    const depositPct = property.depositPercentage ? Number(property.depositPercentage) : 20;
    const depositAmount = offer.depositAmount
      ? Number(offer.depositAmount)
      : Number(((totalStay * depositPct) / 100).toFixed(2));

    const requiredStayBalance = Math.max(0, Number((totalStay - depositAmount).toFixed(2)));

    const prevValidation = (offer.remainingBalanceValidation as any) || {};
    const accumulatedPaidSoFar = Number(prevValidation?.checks?.depositValue?.accumulatedPaidAmount || 0);
    const currentRemaining = Math.max(0, Number((requiredStayBalance - accumulatedPaidSoFar).toFixed(2)));

    if (currentRemaining <= 0) {
      return NextResponse.json({
        success: false,
        error: "O saldo da estadia já está totalmente quitado.",
      });
    }

    let paymentAmount = currentRemaining;
    if (!isFullBalance && rawCustomAmount !== null) {
      if (Number.isNaN(rawCustomAmount) || rawCustomAmount < 1.00) {
        return NextResponse.json(
          { success: false, error: "O valor mínimo para pagamento é R$ 1,00." },
          { status: 400 }
        );
      }
      if (rawCustomAmount > currentRemaining) {
        return NextResponse.json(
          {
            success: false,
            error: `O valor não pode ser superior ao saldo restante de R$ ${currentRemaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
          },
          { status: 400 }
        );
      }
      paymentAmount = Number(rawCustomAmount.toFixed(2));
    }

    const payment = await prisma.offerPayment.create({
      data: {
        offerId: offer.id,
        propertyId: property.id,
        buyerId: offer.buyerId,
        sellerId: property.ownerId,
        acceptedOfferValue: totalStay,
        paymentAmount,
        paymentStatus: "pending",
        contactReleased: true,
      },
    });

    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;
    const siteUrl = process.env.NEXTAUTH_URL || "https://www.realstock.com.br";

    // Direct payment to host: payee.email_address routes funds directly to host
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
            reference_id: `res_bal_${offer.id}_${payment.id}`,
            description: `Saldo da Estadia Reserva #${offer.id} - ${property.title.substring(0, 80)}`,
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
          return_url: `${siteUrl}/minha-conta/ofertas?tab=VIAJANDO&categoria=TEMPORADA`,
          cancel_url: `${siteUrl}/minha-conta/ofertas?tab=VIAJANDO&categoria=TEMPORADA`,
        },
      }),
    });

    const order = await orderRes.json();
    console.log("PAYPAL REMAINING BALANCE ORDER RESPONSE:", order);

    if (!orderRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: order.message || "Erro ao criar ordem de pagamento no PayPal.",
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
      current_remaining: currentRemaining,
      total_stay: totalStay,
      deposit_amount: depositAmount,
      required_stay_balance: requiredStayBalance,
      accumulated_paid: accumulatedPaidSoFar,
    });
  } catch (err: any) {
    console.error("PAYPAL REMAINING BALANCE ORDER ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Erro interno ao processar ordem de saldo no PayPal.",
      },
      { status: 500 }
    );
  }
}
