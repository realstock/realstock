import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const fees = await prisma.siteFee.findMany({
      orderBy: { id: "desc" },
    });

    return NextResponse.json(
      fees.map((fee) => ({
        ...fee,
        value: fee.value.toString(),
      }))
    );
  } catch (error: any) {
    console.error("SITE FEES GET ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao buscar taxas." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const fee = await prisma.siteFee.create({
      data: {
        name: body.name,
        type: body.type,
        value: body.value,
        description: body.description || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({
      ...fee,
      value: fee.value.toString(),
    });
  } catch (error: any) {
    console.error("SITE FEES POST ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao cadastrar taxa." },
      { status: 500 }
    );
  }
}