import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const { id } = await params;

    // Remove transações vinculadas e o registro do upload
    await prisma.$transaction([
      prisma.personalTransaction.deleteMany({
        where: { uploadId: id, userId },
      }),
      prisma.personalUpload.deleteMany({
        where: { id, userId },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Lote e lançamentos excluídos com sucesso." });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Erro ao excluir lote." }, { status: 500 });
  }
}
