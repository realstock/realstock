import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/tiktok/callback`;
        
        // Scopes: user.info.basic, video.upload, video.publish
        const scope = "user.info.basic,video.upload,video.publish";
        const state = Math.random().toString(36).substring(2);

        const tiktokAuthUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

        return NextResponse.redirect(tiktokAuthUrl);
    } catch (error: any) {
        console.error("TIKTOK AUTH ERROR", error);
        return NextResponse.json({ error: "Erro ao iniciar autenticação com TikTok" }, { status: 500 });
    }
}
