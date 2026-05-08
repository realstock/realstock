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
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const propertyId = Number(resolvedParams.id);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // 1. Deletar sessões do Instagram vinculadas a este imóvel
    const deletedInsta = await prisma.instagramPreviewSession.deleteMany({
      where: {
        listingId: propertyId,
      },
    });

    // 2. Deletar sessões do Facebook vinculadas a este imóvel
    const deletedFace = await prisma.facebookFeedSession.deleteMany({
      where: {
        listingId: propertyId,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deletedInsta.count + deletedFace.count,
      message: "Postagens anteriores removidas com sucesso (Instagram e Facebook)",
    });
  } catch (error: any) {
    console.error("DELETE POSTS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao limpar postagens" },
      { status: 500 }
    );
  }
}
