import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");

        if (errorParam) {
            console.error("Google Auth error callback parameter:", errorParam);
            return new NextResponse(
                `<html>
                  <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center;">
                    <h2 style="color: #ef4444;">Erro na Autenticação</h2>
                    <p>${errorParam}</p>
                    <br/>
                    <a href="/minha-conta/anuncios" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voltar aos Anúncios</a>
                  </body>
                </html>`,
                { headers: { "Content-Type": "text/html; charset=UTF-8" } }
            );
        }

        if (!code) {
            return new NextResponse(
                `<html>
                  <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center;">
                    <h2 style="color: #ef4444;">Código não encontrado</h2>
                    <p>O parâmetro code está ausente na resposta do Google.</p>
                  </body>
                </html>`,
                { headers: { "Content-Type": "text/html; charset=UTF-8" } }
            );
        }

        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
             return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login`);
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const origin = new URL(req.url).origin;
        const redirectUri = `${origin}/api/auth/youtube/callback`;

        // Troca o code por Access e Refresh Token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId!,
                client_secret: clientSecret!,
                code: code,
                grant_type: "authorization_code",
                redirect_uri: redirectUri,
            }),
        });

        const tokenData = await tokenRes.json();
        console.log("=== DEBUG YOUTUBE TOKEN EXCHANGE ===");
        console.log("Status:", tokenRes.status);
        console.log("Response Body:", JSON.stringify(tokenData, null, 2));
        console.log("=====================================");

        try {
            const fs = require("fs");
            const path = require("path");
            const scratchDir = path.join(process.cwd(), "scratch");
            if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir);
            fs.writeFileSync(
                path.join(scratchDir, "latest-callback-response.json"),
                JSON.stringify({ status: tokenRes.status, body: tokenData }, null, 2),
                "utf-8"
            );
        } catch (err) {
            console.error("Erro ao gravar arquivo de log do callback:", err);
        }

        if (!tokenRes.ok) {
            console.error("YOUTUBE TOKEN EXCHANGE ERROR", tokenData);
            return new NextResponse(
                `<html>
                  <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center;">
                    <h2 style="color: #ef4444;">Erro ao trocar Token</h2>
                    <p>${tokenData.error_description || "Ocorreu um erro ao negociar as credenciais com o Google."}</p>
                  </body>
                </html>`,
                { headers: { "Content-Type": "text/html; charset=UTF-8" } }
            );
        }

        const token = tokenData.refresh_token;

        // Salva credenciais do YouTube no banco de dados do usuário autenticado
        try {
          const { prisma } = require("@/lib/prisma");
          await prisma.user.update({
            where: { email: session.user.email },
            data: {
              youtubeRefreshToken: token || undefined,
              youtubeAccessToken: tokenData.access_token || undefined,
              youtubeTokenExpiresAt: tokenData.expires_in
                ? new Date(Date.now() + tokenData.expires_in * 1000)
                : undefined,
            },
          });
        } catch (dbErr) {
          console.error("Erro ao salvar tokens do YouTube no banco do usuário:", dbErr);
        }

        if (!token) {
            return new NextResponse(
                `<html>
                  <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f59e0b;">Aviso</h2>
                    <p>O Google não retornou um novo <strong>refresh_token</strong> porque seu canal já foi conectado anteriormente ao sistema, mas as permissões e o acesso atual foram atualizados para sua conta!</p>
                    <br/>
                    <a href="/minha-conta/anuncios" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Voltar para Meus Anúncios</a>
                  </body>
                </html>`,
                { headers: { "Content-Type": "text/html; charset=UTF-8" } }
            );
        }

        return new NextResponse(
            `<html>
              <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #10b981; margin-bottom: 5px;">🎉 Canal YouTube Conectado!</h1>
                <p style="color: #94a3b8; margin-top: 0;">Seu canal foi vinculado com sucesso à sua conta no RealStock.</p>
                <p style="color: #cbd5e1; font-size: 14px;">Agora você já pode publicar seus vídeos diretamente no YouTube Shorts!</p>
                <br/>
                <a href="/minha-conta/anuncios" style="background: #ffffff; color: #0f172a; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Voltar para Meus Anúncios</a>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=UTF-8" } }
        );
    } catch (error: any) {
        console.error("YOUTUBE CALLBACK ERROR", error);
        return new NextResponse(
            `<html>
              <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center;">
                <h2 style="color: #ef4444;">Erro Interno</h2>
                <p>${error.message || "Erro desconhecido"}</p>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=UTF-8" } }
        );
    }
}
