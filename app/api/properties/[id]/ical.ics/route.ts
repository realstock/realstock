import { NextRequest, NextResponse } from "next/server";
import { generateIcalResponse } from "../ical/route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await generateIcalResponse(Number(id), false);
  } catch (error: any) {
    console.error("ERRO /api/properties/[id]/ical.ics:", error);
    return new NextResponse("Erro ao gerar arquivo iCal", { status: 500 });
  }
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await generateIcalResponse(Number(id), true);
  } catch (error: any) {
    return new NextResponse(null, { status: 500 });
  }
}
