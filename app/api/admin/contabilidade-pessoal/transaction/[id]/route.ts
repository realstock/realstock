import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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
    const body = await req.json();

    const updateData: any = {};
    if (body.category) updateData.category = String(body.category).trim();
    if (body.description) updateData.description = String(body.description).trim();
    if (body.accountName) updateData.accountName = String(body.accountName).trim();

    const updated = await prisma.personalTransaction.updateMany({
      where: { id, userId },
      data: updateData,
    });

    if (updated.count === 0) {
      return NextResponse.json({ success: false, error: "Transação não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Erro ao atualizar." }, { status: 500 });
  }
}

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

    const deleted = await prisma.personalTransaction.deleteMany({
      where: { id, userId },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ success: false, error: "Transação não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Erro ao excluir." }, { status: 500 });
  }
}
