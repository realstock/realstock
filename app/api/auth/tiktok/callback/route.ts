import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const state = searchParams.get("state");

        if (!code) {
            return NextResponse.json({ error: "Código de autorização não encontrado" }, { status: 400 });
        }

        const clientKey = process.env.TIKTOK_CLIENT_KEY;
        const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/tiktok/callback`;

        // Exchange code for Access Token
        const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_key: clientKey!,
                client_secret: clientSecret!,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("TIKTOK TOKEN EXCHANGE ERROR", data);
            return NextResponse.json({ error: "Falha ao trocar código por token", details: data }, { status: 500 });
        }

        // SALVAR COMO TOKEN MESTRE (Podemos salvar no primeiro usuário ADMIN ou em uma config global)
        // Por agora, vamos exibir na tela para você copiar e colocar no .env ou eu salvo no banco para o ADMIN
        
        return NextResponse.json({
            success: true,
            message: "TikTok Conectado com Sucesso à RealStock!",
            tokens: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                open_id: data.open_id
            },
            instruction: "Copie esses tokens e envie para o chat para que eu possa configurar a automação final."
        });

    } catch (error: any) {
        console.error("TIKTOK CALLBACK ERROR", error);
        return NextResponse.json({ error: "Erro interno no callback do TikTok" }, { status: 500 });
    }
}
