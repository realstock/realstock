import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/chat/unread - Check latest incoming message for logged in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: true, latestId: null });
    }

    const userId = Number((session.user as any).id);
    if (!userId || isNaN(userId)) {
      return NextResponse.json({ success: true, latestId: null });
    }

    // Find the latest message where senderId != userId in any conversation where user is buyer or seller
    const latestIncoming = await prisma.chatMessage.findFirst({
      where: {
        senderId: { not: userId },
        conversation: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      latestId: latestIncoming ? latestIncoming.id : null,
      latestCreatedAt: latestIncoming ? latestIncoming.createdAt : null,
    });
  } catch (error: any) {
    console.error("GET /api/chat/unread error:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao verificar mensagens não lidas." },
      { status: 500 }
    );
  }
}
