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

    const offers = await prisma.offer.findMany({
      where: {
        buyerId,
      },
      include: {
        property: {
          include: {
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      offers,
    });
  } catch (error: any) {
    console.error("MINHAS OFERTAS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar ofertas.",
      },
      { status: 500 }
    );
  }
}