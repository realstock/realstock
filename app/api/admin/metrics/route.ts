import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Total de imóveis
    const totalProperties = await prisma.property.count();

    // Como ainda não existe campo status no banco,
    // vamos simplificar por enquanto
    const activeProperties = totalProperties;
    const pendingProperties = 0;

    // Usuários
    const totalUsers = await prisma.user.count();

    // Ofertas
    const totalOffers = await prisma.offer.count();

    // Ofertas ativas
    const activeOffers = await prisma.offer.count({
      where: {
        status: {
          in: ["open", "accepted", "matched"],
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalProperties,
        activeProperties,
        pendingProperties,
        totalUsers,
        totalOffers,
        activeOffers,
      },
    });
  } catch (error: any) {
    console.error("ADMIN METRICS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar métricas.",
      },
      { status: 500 }
    );
  }
}