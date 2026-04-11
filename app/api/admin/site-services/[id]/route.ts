import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const service = await prisma.siteService.update({
      where: { id: Number(id) },
      data: {
        feeId: body.feeId ? Number(body.feeId) : null,
      },
    });

    return NextResponse.json(service);
  } catch (error: any) {
    console.error("SITE SERVICES PATCH ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao atualizar serviço." },
      { status: 500 }
    );
  }
}