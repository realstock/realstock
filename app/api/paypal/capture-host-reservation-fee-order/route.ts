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
  if (!res.ok) throw new Error(data.error_description || "Falha PayPal Auth");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { orderID, offerId } = await req.json();

    if (!orderID || !offerId) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: Number(offerId) },
      include: {
        property: { include: { owner: true } },
        buyer: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: "Reserva não encontrada." }, { status: 404 });
    }

    if (offer.property.ownerId !== user.id && user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Apenas o proprietário pode confirmar o aceite." }, { status: 403 });
    }

    let grossAmount = 0;
    let feeAmount = 0;

    if (orderID === "ADMIN_FREE") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Acesso restrito." }, { status: 403 });
      }
    } else {
      const accessToken = await getPayPalAccessToken();
      const base = process.env.PAYPAL_API_BASE!;
      const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      const captureData = await captureRes.json();

      if (captureData.status !== "COMPLETED") {
        return NextResponse.json({ success: false, error: "Pagamento da taxa não concluído." }, { status: 400 });
      }

      try {
        const captureInfo = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        if (captureInfo && captureInfo.seller_receivable_breakdown) {
          grossAmount = parseFloat(captureInfo.seller_receivable_breakdown.gross_amount.value);
          feeAmount = parseFloat(captureInfo.seller_receivable_breakdown.paypal_fee.value);

          await prisma.financialTransaction.createMany({
            data: [
              {
                type: "REVENUE",
                category: "OFFER",
                amount: grossAmount,
                description: `Taxa de Aceite de Reserva (${offer.property.title})`,
                referenceId: captureInfo.id,
                userId: user.id,
              },
              {
                type: "EXPENSE",
                category: "PAYPAL_FEE",
                amount: feeAmount,
                description: `Tarifa PayPal (Aceite de Reserva)`,
                referenceId: captureInfo.id,
                userId: user.id,
              },
            ],
          });
        }
      } catch (finErr) {
        console.error("FINANCE LOGGING ERROR:", finErr);
      }
    }

    // Atualiza oferta para ACCEPTED_WAITING_PAYMENT (ou accepted com hostFeePaidAt)
    const updatedOffer = await prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: "ACCEPTED_WAITING_PAYMENT",
        hostFeePaidAt: new Date(),
      },
    });

    // Abrir/Criar o Chat automaticamente e enviar a mensagem inicial do hóspede
    try {
      let conversation = await prisma.conversation.findFirst({
        where: {
          propertyId: offer.propertyId,
          buyerId: offer.buyerId,
          sellerId: offer.property.ownerId,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            propertyId: offer.propertyId,
            buyerId: offer.buyerId,
            sellerId: offer.property.ownerId,
          },
        });
      }

      const checkInFormatted = offer.startDate
        ? new Date(offer.startDate).toLocaleDateString("pt-BR")
        : "xx/xx/xxxx";
      const checkOutFormatted = offer.endDate
        ? new Date(offer.endDate).toLocaleDateString("pt-BR")
        : "xx/xx/xxxx";

      const initialText = `Olá estou interessado em reservar do periodo de ${checkInFormatted} à ${checkOutFormatted}`;

      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: offer.buyerId,
          text: initialText,
        },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: initialText,
          updatedAt: new Date(),
        },
      });
    } catch (chatErr) {
      console.error("CHAT CREATION ERROR ON RESERVATION ACCEPT:", chatErr);
    }

    // Enviar notificação por e-mail/WhatsApp para o hóspede informando aceite e chave Pix do anfitrião
    try {
      const { sendNotification } = require("@/lib/messenger");
      const pixKeyStr = offer.property.pixKey || "Consulte o anfitrião";
      const depositVal = offer.depositAmount
        ? Number(offer.depositAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "valor combinado";

      await sendNotification({
        toEmail: offer.buyer.email,
        toPhone: offer.buyer.phone || undefined,
        subject: `Reserva Aceita! Próximo passo: pagamento do sinal`,
        text: `Olá ${offer.buyer.name}! O anfitrião aceitou seu pedido de reserva para o imóvel "${offer.property.title}".\n\nChave Pix do anfitrião: ${pixKeyStr}\nValor do Sinal: ${depositVal}\n\nAcesse seu painel na RealStock em 'Meus Pedidos de Reserva' para anexo do comprovante Pix.`,
      });
    } catch (notifErr) {
      console.error("NOTIFICATION ACCEPTERROR:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Reserva aceita e taxa paga com sucesso! Dados de contato liberados.",
      offer: updatedOffer,
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE HOST FEE ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno: " + error.message }, { status: 500 });
  }
}
