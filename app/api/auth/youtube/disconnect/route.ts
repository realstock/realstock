import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
        }

        await prisma.user.update({
            where: { email: session.user.email },
            data: {
                youtubeAccessToken: null,
                youtubeRefreshToken: null,
                youtubeTokenExpiresAt: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("YOUTUBE DISCONNECT ERROR", error);
        return NextResponse.json({ success: false, error: "Erro ao desconectar YouTube" }, { status: 500 });
    }
}
