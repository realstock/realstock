import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const event = await req.json();

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const captureId = event.resource?.id;
      const paypalOrderId =
        event.resource?.supplementary_data?.related_ids?.order_id;

      if (paypalOrderId) {
        const payment = await prisma.offerPayment.findFirst({
          where: { paypalOrderId },
        });

        if (payment) {
          await prisma.offerPayment.update({
            where: { id: payment.id },
            data: {
              paypalCaptureId: captureId,
              paymentStatus: "paid",
              contactReleased: true,
              paidAt: new Date(),
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro no webhook PayPal." },
      { status: 500 }
    );
  }
}