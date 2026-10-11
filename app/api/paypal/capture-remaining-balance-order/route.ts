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
          paymentStatus: "pending",
        },
        orderBy: { id: "desc" },
      });
    }

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Registro de pagamento do saldo não encontrado." },
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
    console.log("PAYPAL REMAINING BALANCE CAPTURE RESPONSE:", captureData);

    const isAlreadyCaptured =
      captureData.name === "ORDER_ALREADY_CAPTURED" ||
      captureData.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED";

    if (!captureRes.ok && !isAlreadyCaptured) {
      return NextResponse.json(
        {
          success: false,
          error: captureData.message || "Erro ao capturar pagamento do saldo no PayPal.",
          detail: captureData,
        },
        { status: 400 }
      );
    }

    const captureId =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.id || payment.paypalCaptureId || orderId;

    const capturedAmountVal =
      captureData?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;

    const capturedAmount = capturedAmountVal
      ? Number(capturedAmountVal)
      : Number(payment.paymentAmount);

    // Update payment record to paid
    await prisma.offerPayment.update({
      where: { id: payment.id },
      data: {
        paypalCaptureId: captureId,
        paymentStatus: "paid",
        contactReleased: true,
        paidAt: new Date(),
      },
    });

    // Calculate totals and accumulate paid history
    const totalStay = Number(offer.totalStayPrice || offer.offerPrice || 0);
    const depositPct = offer.property?.depositPercentage
      ? Number(offer.property.depositPercentage)
      : 20;
    const depositAmount = offer.depositAmount
      ? Number(offer.depositAmount)
      : Number(((totalStay * depositPct) / 100).toFixed(2));

    const requiredStayBalance = Math.max(0, Number((totalStay - depositAmount).toFixed(2)));

    const prevValidation = (offer.remainingBalanceValidation as any) || {};
    let updatedHistory: any[] = Array.isArray(prevValidation?.receiptHistory)
      ? [...prevValidation.receiptHistory]
      : [];

    // Avoid duplicate history item for same captureId
    const existingIndex = updatedHistory.findIndex(
      (h) => h.authCode === captureId || (h.url === "PAYPAL" && h.authCode === orderId)
    );

    const newHistoryItem = {
      url: "PAYPAL",
      amount: capturedAmount,
      authCode: captureId || orderId,
      paypalOrderId: orderId,
      paypalCaptureId: captureId,
      date: new Date().toISOString(),
      method: "PAYPAL",
    };

    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = newHistoryItem;
    } else {
      updatedHistory.push(newHistoryItem);
    }

    const totalAccumulatedPaid = Number(
      updatedHistory
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
        .toFixed(2)
    );

    const isFullyPaid = totalAccumulatedPaid >= requiredStayBalance - 0.05;
    const remaining = Math.max(0, Number((requiredStayBalance - totalAccumulatedPaid).toFixed(2)));

    const updatedValidation = {
      analyzedAt: new Date().toISOString(),
      allPassed: isFullyPaid,
      method: "PAYPAL",
      passedCount: isFullyPaid ? 5 : 4,
      totalChecks: 5,
      receiptHistory: updatedHistory,
      checks: {
        depositValue: {
          passed: isFullyPaid,
          amount: capturedAmount,
          accumulatedPaidAmount: totalAccumulatedPaid,
          expected: requiredStayBalance,
          remaining,
          isPartial: !isFullyPaid,
          label: isFullyPaid
            ? "Saldo Total da Estadia Quitado"
            : `Pagamento Parcial (R$ ${totalAccumulatedPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de R$ ${requiredStayBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
        },
      },
    };

    if (isFullyPaid) {
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          status: "CHECKIN_LIBERADO",
          checkInReleasedAt: new Date(),
          remainingBalanceValidation: updatedValidation,
        },
      });

      // Trigger check-in released notification
      try {
        const { triggerAutoMessage } = await import("@/lib/auto-messages");
        await triggerAutoMessage("ON_CHECKIN_RELEASED", offer.id);
      } catch (autoErr) {
        console.error("Auto message trigger ON_CHECKIN_RELEASED error:", autoErr);
      }
    } else {
      await prisma.offer.update({
        where: { id: offer.id },
        data: {
          remainingBalanceValidation: updatedValidation,
        },
      });
    }

    return NextResponse.json({
      success: true,
      allPassed: isFullyPaid,
      remaining,
      accumulatedPaidAmount: totalAccumulatedPaid,
      capturedAmount,
      offerStatus: isFullyPaid ? "CHECKIN_LIBERADO" : offer.status,
    });
  } catch (err: any) {
    console.error("PAYPAL CAPTURE REMAINING BALANCE ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Erro ao capturar pagamento do saldo.",
      },
      { status: 500 }
    );
  }
}
