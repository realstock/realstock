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

          const offer = await prisma.offer.findUnique({
            where: { id: payment.offerId },
            include: { property: true },
          });

          if (offer && offer.property?.listingType === "ALUGUEL_TEMPORADA") {
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                status: "RESERVA_CONFIRMADA",
                pixValidation: {
                  allPassed: true,
                  method: "PAYPAL",
                  paypalOrderId,
                  paypalCaptureId: captureId,
                  confirmedAt: new Date().toISOString(),
                },
              },
            });

            try {
              const { triggerAutoMessage } = await import("@/lib/auto-messages");
              await triggerAutoMessage("ON_RESERVATION_CONFIRMED", offer.id);
            } catch (autoErr) {
              console.error("Webhook auto message trigger error:", autoErr);
            }
          }
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