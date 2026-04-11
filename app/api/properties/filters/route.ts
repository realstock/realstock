import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || undefined;
    const city = searchParams.get("city") || undefined;

    const statesData = await prisma.property.findMany({ select: { state: true }, distinct: ["state"] });
    const countriesData = await prisma.property.findMany({ select: { country: true }, distinct: ["country"] });
    const typesData = await prisma.property.findMany({ select: { propertyType: true }, distinct: ["propertyType"] });

    let citiesData: { city: string | null }[] = [];
    if (state) {
      citiesData = await prisma.property.findMany({
        where: { state },
        select: { city: true },
        distinct: ["city"],
      });
    }

    let neighborhoodsData: { neighborhood: string | null }[] = [];
    if (state && city) {
      neighborhoodsData = await prisma.property.findMany({
        where: { state, city },
        select: { neighborhood: true },
        distinct: ["neighborhood"],
      });
    }

    return NextResponse.json({
      success: true,
      states: statesData.map(r => r.state).filter(Boolean),
      countries: countriesData.map(r => r.country).filter(Boolean),
      propertyTypes: typesData.map(r => r.propertyType).filter(Boolean),
      cities: citiesData.map(r => r.city).filter(Boolean),
      neighborhoods: neighborhoodsData.map(r => r.neighborhood).filter(Boolean),
    });
  } catch (error: any) {
    console.error("GET FILTERS ERROR", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
