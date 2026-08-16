import { prisma } from "@/lib/prisma";

const userTokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

/**
 * Atualiza e retorna o token de acesso do YouTube caso expirado.
 * Prioriza o youtubeRefreshToken individual do usuário no banco; se ausente, utiliza o YOUTUBE_REFRESH_TOKEN global das variáveis de ambiente.
 */
export async function refreshYoutubeAccessToken(userId?: number): Promise<string | null> {
  let refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  let cacheKey = "GLOBAL";

  if (userId) {
    cacheKey = `USER_${userId}`;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { youtubeRefreshToken: true, youtubeAccessToken: true, youtubeTokenExpiresAt: true },
    });

    if (user?.youtubeRefreshToken) {
      refreshToken = user.youtubeRefreshToken;
    }

    if (
      user?.youtubeAccessToken &&
      user?.youtubeTokenExpiresAt &&
      user.youtubeTokenExpiresAt.getTime() > Date.now() + 5 * 60 * 1000
    ) {
      return user.youtubeAccessToken;
    }
  }

  if (!refreshToken) {
    console.warn("[YouTube Refresh] Nenhum YOUTUBE_REFRESH_TOKEN configurado (nem no usuário nem no .env)");
    return null;
  }

  const cached = userTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.accessToken;
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

    const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    userTokenCache.set(cacheKey, { accessToken: data.access_token, expiresAt });

    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            youtubeAccessToken: data.access_token,
            youtubeTokenExpiresAt: new Date(expiresAt),
          },
        });
      } catch (saveErr) {
        console.warn("[YouTube Refresh] Erro ao salvar token atualizado no usuário:", saveErr);
      }
    }

    return data.access_token;
  } catch (e) {
    console.error("[YouTube Refresh] Falha ao atualizar token do YouTube:", e);
    return null;
  }
}
