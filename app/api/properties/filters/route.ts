import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const statesData = await prisma.property.findMany({ select: { state: true }, distinct: ["state"] });
    const countriesData = await prisma.property.findMany({ select: { country: true }, distinct: ["country"] });
    const typesData = await prisma.property.findMany({ select: { propertyType: true }, distinct: ["propertyType"] });

    return NextResponse.json({
      success: true,
      states: statesData.map(r => r.state).filter(Boolean),
      countries: countriesData.map(r => r.country).filter(Boolean),
      propertyTypes: typesData.map(r => r.propertyType).filter(Boolean)
    });
  } catch (error: any) {
    console.error("GET FILTERS ERROR", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
