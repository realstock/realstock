let cachedAccessToken: string | null = null;
let cachedExpiresAt: number = 0;

/**
 * Atualiza e retorna o token de acesso do YouTube caso expirado.
 * Usa exclusivamente o YOUTUBE_REFRESH_TOKEN global configurado nas variáveis de ambiente.
 */
export async function refreshYoutubeAccessToken(userId?: number): Promise<string | null> {
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    
    if (!refreshToken) {
        console.warn("[YouTube Refresh] YOUTUBE_REFRESH_TOKEN não está configurado no arquivo .env");
        return null;
    }

    // Se o token em cache ainda é válido por mais de 5 minutos, reutiliza
    if (cachedAccessToken && cachedExpiresAt > Date.now() + 5 * 60 * 1000) {
        return cachedAccessToken;
    }

    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            console.warn("[YouTube Refresh] Chaves do Google não configuradas no .env (GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET).");
            return null;
        }

        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            console.error("[YouTube Refresh] Erro ao atualizar token OAuth do YouTube:", data);
            return null;
        }

        cachedAccessToken = data.access_token;
        cachedExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;

        return data.access_token;
    } catch (e) {
        console.error("[YouTube Refresh] Falha catastrófica ao atualizar token do YouTube:", e);
        return null;
    }
}
