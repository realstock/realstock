import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/chat/messages?conversationId=X
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);
    const { searchParams } = new URL(req.url);
    const conversationId = Number(searchParams.get("conversationId"));

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "ID da conversa obrigatório." },
        { status: 400 }
      );
    }

    // Verify conversation access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
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
          select: { id: true, name: true, avatar: true, email: true },
        },
        seller: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversa não encontrada." },
        { status: 404 }
      );
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Acesso negado a esta conversa." },
        { status: 403 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      conversation,
      messages,
    });
  } catch (error: any) {
    console.error("GET MESSAGES ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar mensagens." },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages - Send a new message
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const senderId = Number((session.user as any).id);
    const body = await req.json();
    const conversationId = Number(body.conversation_id);
    const text = String(body.text || "").trim();

    if (!conversationId || !text) {
      return NextResponse.json(
        { success: false, error: "Mensagem ou conversa inválida." },
        { status: 400 }
      );
    }

    // Verify conversation access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: "Conversa não encontrada." },
        { status: 404 }
      );
    }

    if (conversation.buyerId !== senderId && conversation.sellerId !== senderId) {
      return NextResponse.json(
        { success: false, error: "Sem permissão nesta conversa." },
        { status: 403 }
      );
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        text,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update conversation last message & timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: text,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error("SEND MESSAGE ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao enviar mensagem." },
      { status: 500 }
    );
  }
}
