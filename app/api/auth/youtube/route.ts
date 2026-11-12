import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const returnUrl = searchParams.get("returnUrl") || "/minha-conta/anuncios";

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            const origin = new URL(req.url).origin;
            const fullTarget = `${origin}/api/auth/youtube?returnUrl=${encodeURIComponent(returnUrl)}`;
            return NextResponse.redirect(`${origin}/login?callbackUrl=${encodeURIComponent(fullTarget)}`);
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const origin = new URL(req.url).origin;
        const redirectUri = `${origin}/api/auth/youtube/callback`;
        
        // Escopos necessários para leitura do canal e upload para YouTube Shorts
        const scopes = [
            "https://www.googleapis.com/auth/youtube.upload",
            "https://www.googleapis.com/auth/youtube.readonly",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email"
        ].join(" ");
        
        const statePayload = {
            userId: (session.user as any).id,
            email: session.user.email,
            returnUrl,
            salt: Math.random().toString(36).substring(2)
        };
        const state = Buffer.from(JSON.stringify(statePayload)).toString("base64");

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
