import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      north,
      south,
      east,
      west,
      category,
      propertyType,
      priceMin,
      priceMax,
      country,
      state,
      city,
      bedroomsMin,
      bathroomsMin,
      frontSea,
      pool,
      acceptsFinancing,
    } = body;

    if (
      north === undefined ||
      south === undefined ||
      east === undefined ||
      west === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Bounds do mapa são obrigatórios." },
        { status: 400 }
      );
    }

    const where: any = {
      latitude: {
        gte: Number(south),
        lte: Number(north),
      },
      longitude: {
        gte: Number(west),
        lte: Number(east),
      },
    };

    if (category) where.category = category;
    if (propertyType) where.propertyType = propertyType;

    if (country) {
      where.country = { contains: country, mode: "insensitive" };
    }

    if (state) {
      where.state = { contains: state, mode: "insensitive" };
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    if (priceMin || priceMax) {
      where.price = {
        ...(priceMin ? { gte: Number(priceMin) } : {}),
        ...(priceMax ? { lte: Number(priceMax) } : {}),
      };
    }

    if (bedroomsMin) {
      where.bedrooms = { gte: Number(bedroomsMin) };
    }

    if (bathroomsMin) {
      where.bathrooms = { gte: Number(bathroomsMin) };
    }

    if (frontSea) where.frontSea = true;
    if (pool) where.pool = true;
    if (acceptsFinancing) where.acceptsFinancing = true;

    const properties = await prisma.property.findMany({
      where,
      include: {
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return NextResponse.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error: any) {
    console.error("SEARCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro na busca de imóveis.",
      },
      { status: 500 }
    );
  }
}