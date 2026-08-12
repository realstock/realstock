import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listingType = searchParams.get("listingType") || "ALUGUEL_TEMPORADA";

    const properties = await prisma.property.findMany({
      where: {
        listingType: listingType,
      },
      include: {
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

    return NextResponse.json({
      success: true,
      properties,
    });
  } catch (error: any) {
    console.error("PROPERTIES GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar imóveis.",
      },
      { status: 500 }
    );
  }
}