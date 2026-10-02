import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const feeId = Number(id);

    if (isNaN(feeId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido." },
        { status: 400 }
      );
    }

    // Desvincular de quaisquer serviços antes de excluir para manter a integridade referencial
    await prisma.$transaction([
      prisma.siteService.updateMany({
        where: { feeId },
        data: { feeId: null },
      }),
      prisma.siteFee.delete({
        where: { id: feeId },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Taxa excluída com sucesso." });
  } catch (error: any) {
    console.error("SITE FEES DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Erro ao excluir taxa." },
      { status: 500 }
    );
  }
}
