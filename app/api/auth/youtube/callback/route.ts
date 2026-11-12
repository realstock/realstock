import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clearYoutubeTokenCache } from "@/lib/youtube";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get("code");
        const stateParam = searchParams.get("state");
        const errorParam = searchParams.get("error");

        let stateData: { userId?: number; email?: string; returnUrl?: string } = {};
        if (stateParam) {
            try {
                stateData = JSON.parse(Buffer.from(stateParam, "base64").toString("utf-8"));
            } catch (e) {
                console.warn("[YouTube Callback] Não foi possível decodificar o state:", e);
            }
        }

        const origin = new URL(req.url).origin;
        const returnUrl = stateData.returnUrl || "/minha-conta/anuncios";

        if (errorParam) {
            console.error("Google Auth error callback parameter:", errorParam);
            return new NextResponse(
                `<html>
                  <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center;">
                    <h2 style="color: #ef4444;">Erro na Autenticação com o Google</h2>
                    <p>${errorParam}</p>
                    <br/>
                    <a href="${returnUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voltar</a>
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
                    <br/>
                    <a href="${returnUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voltar</a>
                  </body>
                </html>`,
                { headers: { "Content-Type": "text/html; charset=UTF-8" } }
            );
        }

        const session = await getServerSession(authOptions);
        const targetEmail = session?.user?.email || stateData.email;
        const targetUserId = (session?.user as any)?.id || stateData.userId;

        // Se não tiver sessão nem state, busca o usuário admin padrão
        let userToUpdate = null;
        if (targetEmail) {
            userToUpdate = await prisma.user.findUnique({ where: { email: targetEmail } });
        } else if (targetUserId) {
            userToUpdate = await prisma.user.findUnique({ where: { id: Number(targetUserId) } });
        } else {
            userToUpdate = await prisma.user.findFirst({ where: { role: "ADMIN" } }) || await prisma.user.findFirst();
        }

        if (!userToUpdate) {
            return NextResponse.redirect(`${origin}/login`);
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
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
        console.log("=== YOUTUBE TOKEN EXCHANGE RESULT ===");
        console.log("Status:", tokenRes.status);
        console.log("Has Refresh Token:", !!tokenData.refresh_token);
        console.log("Has Access Token:", !!tokenData.access_token);
        console.log("Expires in:", tokenData.expires_in);
        console.log("=====================================");

        if (!tokenRes.ok) {
            console.error("YOUTUBE TOKEN EXCHANGE ERROR", tokenData);
            return new NextResponse(
                `<html>
                  <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center;">
                    <h2 style="color: #ef4444;">Erro ao trocar Token</h2>
                    <p>${tokenData.error_description || tokenData.error || "Ocorreu um erro ao negociar as credenciais com o Google."}</p>
                    <br/>
                    <a href="${returnUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voltar</a>
                  </body>
                </html>`,
                { headers: { "Content-Type": "text/html; charset=UTF-8" } }
            );
        }

        const refreshToken = tokenData.refresh_token;

        // Salva credenciais do YouTube no banco de dados do usuário
        await prisma.user.update({
            where: { id: userToUpdate.id },
            data: {
                youtubeRefreshToken: refreshToken || undefined,
                youtubeAccessToken: tokenData.access_token || undefined,
                youtubeTokenExpiresAt: tokenData.expires_in
                    ? new Date(Date.now() + tokenData.expires_in * 1000)
                    : undefined,
            },
        });

        // Se recebemos um novo refresh_token, persistir nas variáveis de ambiente e arquivos .env
        if (refreshToken) {
            process.env.YOUTUBE_REFRESH_TOKEN = refreshToken;

            const updateEnvFile = (filename: string) => {
                try {
                    const filePath = path.join(process.cwd(), filename);
                    if (fs.existsSync(filePath)) {
                        let content = fs.readFileSync(filePath, "utf-8");
                        if (content.includes("YOUTUBE_REFRESH_TOKEN=")) {
                            content = content.replace(
                                /YOUTUBE_REFRESH_TOKEN=.*(\r?\n|$)/g,
                                `YOUTUBE_REFRESH_TOKEN="${refreshToken}"$1`
                            );
                        } else {
                            content += `\nYOUTUBE_REFRESH_TOKEN="${refreshToken}"\n`;
                        }
                        fs.writeFileSync(filePath, content, "utf-8");
                        console.log(`[YouTube Callback] ${filename} atualizado com novo YOUTUBE_REFRESH_TOKEN.`);
                    }
                } catch (envErr) {
                    console.error(`[YouTube Callback] Erro ao atualizar ${filename}:`, envErr);
                }
            };

            updateEnvFile(".env.local");
            updateEnvFile(".env");
        }

        // Limpa o cache em memória para recarregar o novo token imediatamente
        clearYoutubeTokenCache();

        // Redireciona o usuário de volta para a tela de origem
        const separator = returnUrl.includes("?") ? "&" : "?";
        const redirectDestination = `${returnUrl}${separator}youtube_connected=true`;

        return NextResponse.redirect(`${origin}${redirectDestination}`);
    } catch (error: any) {
        console.error("YOUTUBE CALLBACK ERROR", error);
        return new NextResponse(
            `<html>
              <body style="font-family: sans-serif; background: #0f172a; color: white; padding: 40px; text-align: center;">
                <h2 style="color: #ef4444;">Erro Interno</h2>
                <p>${error.message || "Erro desconhecido"}</p>
                <br/>
                <a href="/minha-conta/anuncios" style="background: #3b82f6; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voltar para Anúncios</a>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html; charset=UTF-8" } }
        );
    }
}
