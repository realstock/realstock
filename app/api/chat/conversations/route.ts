import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chat/conversations - List all conversations for the user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            neighborhood: true,
            price: true,
            listingType: true,
            images: {
              take: 1,
              orderBy: { sortOrder: "asc" },
              select: { imageUrl: true },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error("GET CONVERSATIONS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar conversas." },
      { status: 500 }
    );
  }
}

// POST /api/chat/conversations - Get or create a conversation for a property
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const currentUserId = Number((session.user as any).id);
    const body = await req.json();
    const propertyId = Number(body.property_id);
    const targetUserId = Number(body.target_user_id);

    if (!propertyId || !targetUserId) {
      return NextResponse.json(
        { success: false, error: "Dados incompletos." },
        { status: 400 }
      );
    }

    // Determine buyer and seller
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerId: true },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Imóvel não encontrado." },
        { status: 404 }
      );
    }

    let sellerId = property.ownerId;
    let buyerId = currentUserId === sellerId ? targetUserId : currentUserId;

    // Check if conversation already exists
    let conversation = await prisma.conversation.findFirst({
      where: {
        propertyId,
        buyerId,
        sellerId,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          propertyId,
          buyerId,
          sellerId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
    });
  } catch (error: any) {
    console.error("CREATE CONVERSATION ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao criar/buscar conversa." },
      { status: 500 }
    );
  }
}
