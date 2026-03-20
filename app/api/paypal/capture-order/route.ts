import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";


async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const base = process.env.PAYPAL_API_BASE!;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

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
    console.error("Erro OAuth PayPal capture:", data);
    throw new Error(data.error_description || "Falha ao autenticar no PayPal.");
  }

  return data.access_token as string;
}

async function fetchOrder(paypalOrderId: string, accessToken: string, base: string) {
  const res = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();

  console.log("PayPal order GET status:", res.status);
  console.log("PayPal order GET body:", JSON.stringify(data, null, 2));

  return data;
}

function extractCompletedCapture(data: any) {
  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
  if (capture?.id && capture?.status === "COMPLETED") {
    return capture;
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paypalOrderId = String(body.paypal_order_id || "");

    if (!paypalOrderId) {
      return NextResponse.json(
        { success: false, error: "paypal_order_id não informado." },
        { status: 400 }
      );
    }

    const payment = await prisma.offerPayment.findFirst({
      where: { paypalOrderId },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Pagamento não encontrado para esta ordem." },
        { status: 404 }
      );
    }

    if (payment.paymentStatus === "paid") {
      return NextResponse.json({
        success: true,
        already_paid: true,
      });
    }

    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const captureRes = await fetch(
      `${base}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const captureData = await captureRes.json();

    console.log("PayPal capture status:", captureRes.status);
    console.log("PayPal capture body:", JSON.stringify(captureData, null, 2));

    let capture = extractCompletedCapture(captureData);

    if (!capture) {
      const orderData = await fetchOrder(paypalOrderId, accessToken, base);
      capture = extractCompletedCapture(orderData);
    }

    if (!capture) {
      return NextResponse.json(
        {
          success: false,
          error: captureData?.message || "Pagamento não pôde ser confirmado.",
          detail: captureData,
        },
        { status: 500 }
      );
    }

    await prisma.offerPayment.update({
      where: { id: payment.id },
      data: {
        paypalCaptureId: capture.id,
        paymentStatus: "paid",
        contactReleased: true,
        paidAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      capture_id: capture.id,
      capture_status: capture.status,
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Não foi possível confirmar o pagamento.",
      },
      { status: 500 }
    );
  }
}