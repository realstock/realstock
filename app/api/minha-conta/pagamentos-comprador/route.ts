import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const buyerId = Number(searchParams.get("buyer_id"));

    if (!buyerId) {
      return NextResponse.json(
        { success: false, error: "buyer_id não informado." },
        { status: 400 }
      );
    }

    const payments = await prisma.offerPayment.findMany({
      where: {
        buyerId,
      },
      include: {
        property: {
          include: {
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Não foi possível carregar os pagamentos." },
      { status: 500 }
    );
  }
}