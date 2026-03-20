import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payments = await prisma.offerPayment.findMany({
      include: {
        seller: true,
        offer: {
          include: {
            buyer: true,
            property: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("ADMIN PAGAMENTOS ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao carregar pagamentos." },
      { status: 500 }
    );
  }
}