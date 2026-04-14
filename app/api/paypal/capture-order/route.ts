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
    const orderId = String(body.orderID || body.orderId || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderID não informado." },
        { status: 400 }
      );
    }

    const payment = await prisma.offerPayment.findFirst({
      where: {
        paypalOrderId: orderId,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Pagamento não encontrado para esta ordem." },
        { status: 404 }
      );
    }

    if (payment.paymentStatus === "paid" && payment.contactReleased) {
      return NextResponse.json({
        success: true,
        already_paid: true,
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

    console.log("PAYPAL CAPTURE RESPONSE:", captureData);

    if (!captureRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: captureData.message || "Erro ao capturar pagamento PayPal.",
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

    if (!captureId || !captureStatus) {
      return NextResponse.json(
        {
          success: false,
          error: "Resposta do PayPal incompleta ao capturar pagamento.",
          detail: captureData,
        },
        { status: 400 }
      );
    }

    const paid =
      String(captureStatus).toUpperCase() === "COMPLETED" ||
      String(captureStatus).toUpperCase() === "APPROVED";

    if (!paid) {
      return NextResponse.json(
        {
          success: false,
          error: `Pagamento não concluído. Status: ${captureStatus}`,
        },
        { status: 400 }
      );
    }

    // Accounting Logic
    try {
        const captureInfo = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        if (captureInfo && captureInfo.seller_receivable_breakdown) {
            const grossAmount = parseFloat(captureInfo.seller_receivable_breakdown.gross_amount.value);
            const feeAmount = parseFloat(captureInfo.seller_receivable_breakdown.paypal_fee.value);

            await prisma.financialTransaction.createMany({
                data: [
                    {
                        type: "REVENUE",
                        category: "OFFER",
                        amount: grossAmount,
                        description: `Aprovação de Oferta (Imóvel #${payment.propertyId})`,
                        referenceId: orderId,
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (Oferta)`,
                        referenceId: orderId,
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR:", finErr);
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

    return NextResponse.json({
      success: true,
      paymentStatus: "paid",
      contactReleased: true,
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao capturar pagamento PayPal.",
      },
      { status: 500 }
    );
  }
}