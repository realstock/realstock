import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalProperties = await prisma.property.count();

    const activeProperties = await prisma.property.count({
      where: { status: "active" },
    });

    const pendingProperties = await prisma.property.count({
      where: { status: "pending" },
    });

    const expiredProperties = await prisma.property.count({
      where: { status: "expired" },
    });

    const totalUsers = await prisma.user.count();

    const activeSellers = await prisma.property.groupBy({
      by: ["ownerId"],
    });

    const totalOffers = await prisma.offer.count();

    return NextResponse.json({
      success: true,
      metrics: {
        totalProperties,
        activeProperties,
        pendingProperties,
        expiredProperties,
        totalUsers,
        activeSellers: activeSellers.length,
        totalOffers,
      },
    });
  } catch (error: any) {
    console.error("ADMIN METRICS ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao carregar métricas" },
      { status: 500 }
    );
  }
}