import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      include: {
        owner: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      properties,
    });
  } catch (error: any) {
    console.error("ADMIN IMOVEIS ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao carregar imóveis." },
      { status: 500 }
    );
  }
}