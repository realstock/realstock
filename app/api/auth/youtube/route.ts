import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const origin = new URL(req.url).origin;
        const redirectUri = `${origin}/api/auth/youtube/callback`;
        
        // Solicita escopo de upload, leitura do YouTube e Google Ads
        const scopes = [
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/adwords"
        ].join(" ");
        
        const state = Math.random().toString(36).substring(2);

        // redirect to google oauth
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
            client_id: clientId!,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: scopes,
            access_type: "offline",
            prompt: "consent",
            state: state
        }).toString();

        return NextResponse.redirect(googleAuthUrl);
    } catch (error: any) {
        console.error("YOUTUBE AUTH ERROR", error);
        return NextResponse.json({ error: "Erro ao iniciar autenticação com YouTube" }, { status: 500 });
    }
}
