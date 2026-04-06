import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const buyerId = Number(searchParams.get("buyer_id"));

    if (!buyerId || Number.isNaN(buyerId)) {
      return NextResponse.json(
        { success: false, error: "buyer_id inválido." },
        { status: 400 }
      );
    }

    const payments = await prisma.offerPayment.findMany({
      where: {
        buyerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const propertyIds = payments
      .map((payment) => payment.propertyId)
      .filter(Boolean);

    const properties = propertyIds.length
      ? await prisma.property.findMany({
          where: {
            id: { in: propertyIds },
          },
          include: {
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
            },
          },
        })
      : [];

    const propertiesMap = new Map(
      properties.map((property) => [property.id, property])
    );

    const enrichedPayments = payments.map((payment) => {
      const property = propertiesMap.get(payment.propertyId);

      return {
  id: payment.id,
  offerId: payment.offerId,
  buyerId: payment.buyerId,
  sellerId: payment.sellerId,
  propertyId: payment.propertyId,
  acceptedOfferValue: payment.acceptedOfferValue,
  paymentAmount: payment.paymentAmount,
  paypalOrderId: payment.paypalOrderId,
  paypalCaptureId: payment.paypalCaptureId,
  paymentStatus: payment.paymentStatus,
  contactReleased: payment.contactReleased,
  paidAt: payment.paidAt,
  createdAt: payment.createdAt,
  property: property
    ? {
        id: property.id,
        title: property.title,
        city: property.city,
        state: property.state,
        neighborhood: property.neighborhood,
        images: property.images,
      }
    : null,
};
    });

    return NextResponse.json({
      success: true,
      payments: enrichedPayments,
    });
  } catch (error: any) {
    console.error("PAGAMENTOS COMPRADOR ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar pagamentos do comprador.",
      },
      { status: 500 }
    );
  }
}