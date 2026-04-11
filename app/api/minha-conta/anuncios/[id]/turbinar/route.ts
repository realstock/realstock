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

    let property: any = null;

    if (propertyId === 0) {
      property = {
        id: 0,
        title: "Portfólio de Imóveis (Todos)",
        state: user.state || "Brasil",
        images: [{ imageUrl: user.avatar || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }]
      };
    } else {
      property = await prisma.property.findFirst({
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
    }

    const igSession = await prisma.instagramPreviewSession.findFirst({
        where: {
            listingId: propertyId,
            status: "PUBLISHED"
        },
        orderBy: { createdAt: "desc" }
    });

    if (!igSession || !igSession.publishedMediaId) {
        return NextResponse.json(
            { success: false, error: "Este anúncio não foi publicado no Instagram ainda ou não encontramos o registro." },
            { status: 400 }
        );
    }

    // Fetch the site service for 'turbinar'
    const service = await prisma.siteService.findUnique({
      where: { slug: "turbinar" },
      include: { fee: true },
    });

    return NextResponse.json({
      success: true,
      property,
      instagramMediaId: igSession.publishedMediaId,
      service
    });
  } catch (error: any) {
    console.error("GET BOOST DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
