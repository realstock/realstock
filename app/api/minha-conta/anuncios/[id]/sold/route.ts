import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSoldToggle(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleSoldToggle(req, params);
}

async function handleSoldToggle(
  req: NextRequest,
  params: Promise<{ id: string }>
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

    if (isNaN(propertyId)) {
      return NextResponse.json(
        { success: false, error: "ID inválido" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Buscar o imóvel e garantir que pertence ao usuário logado
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ownerId: user.id,
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Anúncio não encontrado ou sem permissão" },
        { status: 404 }
      );
    }

    // Alternar o status de "sold"
    const newSoldStatus = !property.sold;

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: { sold: newSoldStatus },
    });

    console.log(`PROPERTY SOLD TOGGLE SUCCESS: Property ${propertyId} sold status updated to ${newSoldStatus}`);

    return NextResponse.json({
      success: true,
      sold: updatedProperty.sold,
      message: newSoldStatus ? "Imóvel marcado como vendido com sucesso!" : "Anúncio reativado com sucesso!",
    });
  } catch (error: any) {
    console.error("PROPERTY SOLD TOGGLE ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao atualizar status do anúncio" },
      { status: 500 }
    );
  }
}
