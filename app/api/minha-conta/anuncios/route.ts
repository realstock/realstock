import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = Number(searchParams.get("owner_id"));

    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: "owner_id não informado." },
        { status: 400 }
      );
    }

    const properties = await prisma.property.findMany({
      where: {
        ownerId,
      },
      include: {
        images: {
          orderBy: {
            sortOrder: "asc",
          },
          take: 1,
        },
        offers: {
          orderBy: {
            offerPrice: "desc",
          },
          include: {
            buyer: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    const payments = await prisma.offerPayment.findMany({
      where: {
        sellerId: ownerId,
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      properties,
      payments,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Não foi possível carregar os anúncios." },
      { status: 500 }
    );
  }
}