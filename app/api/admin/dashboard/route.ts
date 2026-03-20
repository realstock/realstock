import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalProperties,
      totalUsers,
      totalOffers,
      totalPayments,
      paidPayments,
    ] = await Promise.all([
      prisma.property.count(),
      prisma.user.count(),
      prisma.offer.count(),
      prisma.offerPayment.count(),
      prisma.offerPayment.findMany({
        where: { paymentStatus: "paid" },
      }),
    ]);

    const totalRevenue = paidPayments.reduce(
      (sum, p) => sum + Number(p.paymentAmount),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        totalProperties,
        totalUsers,
        totalOffers,
        totalPayments,
        totalRevenue,
      },
    });
  } catch (error: any) {
    console.error("DASHBOARD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro ao carregar dashboard.",
      },
      { status: 500 }
    );
  }
}