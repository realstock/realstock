import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payments = await prisma.offerPayment.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    const offerIds = payments.map((payment) => payment.offerId).filter(Boolean);
    const buyerIds = payments.map((payment) => payment.buyerId).filter(Boolean);
    const sellerIds = payments.map((payment) => payment.sellerId).filter(Boolean);
    const propertyIds = payments
      .map((payment) => payment.propertyId)
      .filter(Boolean);

    const [offers, buyers, sellers, properties] = await Promise.all([
      offerIds.length
        ? prisma.offer.findMany({
            where: {
              id: { in: offerIds },
            },
          })
        : [],
      buyerIds.length
        ? prisma.user.findMany({
            where: {
              id: { in: buyerIds },
            },
          })
        : [],
      sellerIds.length
        ? prisma.user.findMany({
            where: {
              id: { in: sellerIds },
            },
          })
        : [],
      propertyIds.length
        ? prisma.property.findMany({
            where: {
              id: { in: propertyIds },
            },
          })
        : [],
    ]);

    const offersMap = new Map(offers.map((offer) => [offer.id, offer]));
    const buyersMap = new Map(buyers.map((buyer) => [buyer.id, buyer]));
    const sellersMap = new Map(sellers.map((seller) => [seller.id, seller]));
    const propertiesMap = new Map(
      properties.map((property) => [property.id, property])
    );

    const enrichedPayments = payments.map((payment) => {
      const offer = offersMap.get(payment.offerId);
      const buyer = buyersMap.get(payment.buyerId);
      const seller = sellersMap.get(payment.sellerId);
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
        seller: seller
          ? {
              id: seller.id,
              name: seller.name,
              email: seller.email,
            }
          : null,
        offer: {
          id: offer?.id ?? payment.offerId,
          offerPrice: offer?.offerPrice ?? payment.acceptedOfferValue,
          status: offer?.status ?? "-",
          buyer: buyer
            ? {
                id: buyer.id,
                name: buyer.name,
                email: buyer.email,
              }
            : null,
          property: property
            ? {
                id: property.id,
                title: property.title,
                city: property.city,
                state: property.state,
                neighborhood: property.neighborhood,
              }
            : null,
        },
      };
    });

    return NextResponse.json({
      success: true,
      payments: enrichedPayments,
    });
  } catch (error: any) {
    console.error("PAGAMENTOS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar pagamentos.",
      },
      { status: 500 }
    );
  }
}