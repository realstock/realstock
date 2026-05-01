import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 403 });
    }

    // Buscar todos os usuários e suas relações de indicação
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        referrerId: true,
        viralizarCredits: true,
        referralCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("NETWORK TREE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
