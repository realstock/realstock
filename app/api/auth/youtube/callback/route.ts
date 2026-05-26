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

        if (!token) {
            return new NextResponse(
                `<html>
                  <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #f59e0b;">Aviso</h2>
                    <p>O Google não retornou o <strong>refresh_token</strong>. Isso acontece porque o canal já estava conectado anteriormente em sua conta.</p>
                    <p>Para obter o token novamente:</p>
                    <ol style="text-align: left; line-height: 1.6;">
                      <li>Acesse a página de permissões da sua <a href="https://myaccount.google.com/permissions" target="_blank" style="color: #3b82f6; text-decoration: underline;">Conta Google</a>.</li>
                      <li>Remova o acesso do aplicativo <strong>RealStock</strong>.</li>
                      <li>Clique no link abaixo para tentar conectar novamente.</li>
                    </ol>
                    <br/>
                    <a href="/api/auth/youtube" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 10px;">Tentar Conectar Novamente</a>
                  </body>
                </html>`,
                { headers: { "Content-Type": "text/html; charset=UTF-8" } }
            );
        }

        return new NextResponse(
            `<html>
              <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #10b981; margin-bottom: 5px;">🎉 Canal Conectado!</h1>
                <p style="color: #94a3b8; margin-top: 0;">Conexão realizada com sucesso.</p>
                
                <p>Copie o token de atualização abaixo e adicione ao seu arquivo <strong>.env</strong>:</p>
                <div style="background: #1e293b; border: 1px solid #334155; padding: 15px; border-radius: 8px; font-family: monospace; word-break: break-all; margin: 20px 0; font-size: 14px; user-select: all; color: #38bdf8; text-align: left;">
                  YOUTUBE_REFRESH_TOKEN=${token}
                </div>
                <p style="color: #94a3b8; font-size: 12px;">Depois de colar no arquivo <strong>.env</strong>, reinicie o servidor do projeto para aplicar as configurações.</p>
                <br/>
                <a href="/minha-conta/anuncios" style="background: #ffffff; color: #0f172a; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Voltar aos Anúncios</a>
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
