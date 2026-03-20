import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const offers = await prisma.offer.findMany({
      include: {
        buyer: true,
        property: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      offers,
    });
  } catch (error) {
    console.error("ADMIN OFERTAS ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao carregar ofertas." },
      { status: 500 }
    );
  }
}