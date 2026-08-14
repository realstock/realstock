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
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao autenticar no PayPal.");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const offerId = Number(body.offer_id);

    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json({ success: false, error: "Reserva inválida." }, { status: 400 });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: { property: true },
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: "Reserva não encontrada." }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || offer.property.ownerId !== user.id) {
      return NextResponse.json({ success: false, error: "Apenas o proprietário/anfitrião pode aceitar este pedido." }, { status: 403 });
    }

    if (!user.identityDocumentUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "É necessário enviar seu Documento de Identidade em PDF no seu cadastro para aceitar reservas.",
          code: "DOCUMENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    const totalStay = Number(offer.totalStayPrice || offer.offerPrice || 0);

    // Consultar taxa configurada no administrativo (slug: taxa-aceite-reserva ou 1%)
    const service = await prisma.siteService.findUnique({
      where: { slug: "taxa-aceite-reserva" },
      include: { fee: true },
    });

    let feeAmount = totalStay * 0.01; // Default 1%
    if (service?.fee) {
      if (service.fee.type === "PERCENTAGE") {
        feeAmount = (totalStay * Number(service.fee.value)) / 100;
      } else {
        feeAmount = Number(service.fee.value);
      }
    }

    const finalFee = Math.max(feeAmount, 1.00); // Mínimo R$ 1.00 para cobrança PayPal

    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `reservation_fee_${offer.id}`,
            amount: {
              currency_code: "BRL",
              value: finalFee.toFixed(2),
            },
            description: `Taxa de aceite de reserva de temporada - Imóvel ${offer.property.title}`,
          },
        ],
        application_context: { user_action: "PAY_NOW" },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      return NextResponse.json({ success: false, error: order.message || "Erro no PayPal.", detail: order }, { status: 400 });
    }

    return NextResponse.json({ success: true, paypal_order_id: order.id, fee_amount: finalFee });
  } catch (error: any) {
    console.error("PAYPAL CREATE RESERVATION FEE ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno ao gerar cobrança da taxa." }, { status: 500 });
  }
}
