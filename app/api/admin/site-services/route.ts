import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.siteService.findMany({
      orderBy: { id: "desc" },
    });

    return NextResponse.json(services);
  } catch (error: any) {
    console.error("SITE SERVICES GET ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao buscar serviços." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const service = await prisma.siteService.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        isActive: body.isActive ?? true,
        feeId: body.feeId ? Number(body.feeId) : null,
      },
    });

    return NextResponse.json(service);
  } catch (error: any) {
    console.error("SITE SERVICES POST ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao cadastrar serviço." },
      { status: 500 }
    );
  }
}