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
    const orderId = String(body.orderID || body.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderID não informado." },
        { status: 400 }
      );
    }

    let payment = await prisma.offerPayment.findFirst({
      where: {
        paypalOrderId: orderId,
      },
    });

    if (!payment && body.offer_id) {
      payment = await prisma.offerPayment.findFirst({
        where: {
          offerId: Number(body.offer_id),
        },
      });
    }

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Registro de pagamento não encontrado para esta ordem." },
        { status: 404 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: payment.offerId },
      include: { property: true },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Reserva associada não encontrada." },
        { status: 404 }
      );
    }

    if (payment.paymentStatus === "paid" && offer.status === "RESERVA_CONFIRMADA") {
      return NextResponse.json({
        success: true,
        already_paid: true,
        offerStatus: "RESERVA_CONFIRMADA",
      });
    }

    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureRes.json();
    console.log("PAYPAL RESERVATION CAPTURE RESPONSE:", captureData);

    if (!captureRes.ok) {
      // If already captured, handle gracefully
      if (captureData.name === "ORDER_ALREADY_CAPTURED" || captureData.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
        await prisma.offerPayment.update({
          where: { id: payment.id },
          data: {
            paymentStatus: "paid",
            contactReleased: true,
            paidAt: new Date(),
          },
        });

        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            status: "RESERVA_CONFIRMADA",
            pixValidation: {
              allPassed: true,
              method: "PAYPAL",
              paypalOrderId: orderId,
              confirmedAt: new Date().toISOString(),
            },
          },
        });

        return NextResponse.json({
          success: true,
          paymentStatus: "paid",
          offerStatus: "RESERVA_CONFIRMADA",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: captureData.message || "Erro ao capturar pagamento da reserva no PayPal.",
          detail: captureData,
        },
        { status: 400 }
      );
    }

    const captureId =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

    const captureStatus =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.status ||
      captureData?.status ||
      null;

    const paid =
      String(captureStatus).toUpperCase() === "COMPLETED" ||
      String(captureStatus).toUpperCase() === "APPROVED";

    if (!paid) {
      return NextResponse.json(
        {
          success: false,
          error: `Pagamento não concluído. Status retornado: ${captureStatus}`,
        },
        { status: 400 }
      );
    }

    await prisma.offerPayment.update({
      where: { id: payment.id },
      data: {
        paypalCaptureId: captureId,
        paymentStatus: "paid",
        contactReleased: true,
        paidAt: new Date(),
      },
    });

    await prisma.offer.update({
      where: { id: offer.id },
      data: {
        status: "RESERVA_CONFIRMADA",
        pixValidation: {
          allPassed: true,
          method: "PAYPAL",
          paypalOrderId: orderId,
          paypalCaptureId: captureId,
          amount: Number(payment.paymentAmount || offer.depositAmount || 0),
          confirmedAt: new Date().toISOString(),
        },
      },
    });

    // Enviar mensagem automática de confirmação da reserva
    try {
      const { triggerAutoMessage } = await import("@/lib/auto-messages");
      await triggerAutoMessage("ON_RESERVATION_CONFIRMED", offer.id);
    } catch (autoErr) {
      console.error("Auto message trigger ON_RESERVATION_CONFIRMED error:", autoErr);
    }

    return NextResponse.json({
      success: true,
      paymentStatus: "paid",
      offerStatus: "RESERVA_CONFIRMADA",
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE RESERVATION ORDER ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao capturar pagamento da reserva.",
      },
      { status: 500 }
    );
  }
}
