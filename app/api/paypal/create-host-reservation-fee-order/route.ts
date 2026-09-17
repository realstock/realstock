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

    const isCompraVenda = offer.property?.listingType === "COMPRA_VENDA" || offer.property?.listingType === "VENDA";
    const basePrice = Number(offer.offerPrice || offer.totalStayPrice || offer.property?.price || 0);

    // Consultar taxa configurada no administrativo
    const targetSlugs = isCompraVenda
      ? ["oferta", "taxa-aceite-oferta", "compra-venda", "taxa-oferta"]
      : ["aluguel-temporada", "taxa-aceite-reserva", "temporada"];

    let service = await prisma.siteService.findFirst({
      where: {
        slug: { in: targetSlugs },
        isActive: true,
      },
      include: { fee: true },
    });

    if (!service) {
      const searchTerm = isCompraVenda ? "oferta" : "temporada";
      service = await prisma.siteService.findFirst({
        where: {
          name: { contains: searchTerm, mode: "insensitive" },
          isActive: true,
        },
        include: { fee: true },
      });
    }

    let feeAmount = 0;
    let feePercentage = 0;
    let isPercentage = false;

    if (service?.fee && service.fee.isActive) {
      if (service.fee.type === "PERCENTAGE") {
        feePercentage = Number(service.fee.value);
        isPercentage = true;
        feeAmount = (basePrice * feePercentage) / 100;
      } else {
        feeAmount = Number(service.fee.value);
      }
    } else {
      // Fallback padrão se não houver taxa cadastrada
      feePercentage = isCompraVenda ? 0.1 : 1;
      isPercentage = true;
      feeAmount = (basePrice * feePercentage) / 100;
    }

    const finalFee = Math.max(feeAmount, 1.00); // Mínimo R$ 1.00 para cobrança PayPal

    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const itemDescription = isCompraVenda
      ? `Taxa de aceite de oferta de compra e venda - Imóvel ${offer.property.title}`
      : `Taxa de aceite de reserva de temporada - Imóvel ${offer.property.title}`;

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
            description: itemDescription,
          },
        ],
        application_context: { user_action: "PAY_NOW" },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      return NextResponse.json({ success: false, error: order.message || "Erro no PayPal.", detail: order }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      paypal_order_id: order.id,
      fee_amount: finalFee,
      fee_percentage: isPercentage ? feePercentage : null,
      fee_type: service?.fee?.type || (isPercentage ? "PERCENTAGE" : "FIXED"),
      is_compra_venda: isCompraVenda,
    });
  } catch (error: any) {
    console.error("PAYPAL CREATE RESERVATION FEE ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno ao gerar cobrança da taxa." }, { status: 500 });
  }
}
