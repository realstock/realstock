import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const offerId = Number(body.offerId);
    const status = String(body.status || "").trim();

    if (!offerId || !status) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos." },
        { status: 400 }
      );
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: { status },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("ADMIN OFERTAS STATUS ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao atualizar oferta." },
      { status: 500 }
    );
  }
}