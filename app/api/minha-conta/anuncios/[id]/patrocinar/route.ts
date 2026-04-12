import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        ownerId: user.id,
      },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Anúncio não encontrado ou sem permissão" },
        { status: 404 }
      );
    }

    const service = await prisma.siteService.findUnique({
      where: { slug: "patrocinio" },
      include: { fee: true },
    });

    if (!service || !service.fee) {
      return NextResponse.json(
        { success: false, error: "Serviço de patrocínio indisponível no momento." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      property,
      service
    });
  } catch (error: any) {
    console.error("GET SPONSOR DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
