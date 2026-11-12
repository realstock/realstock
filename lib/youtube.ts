import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

const userTokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

export function clearYoutubeTokenCache() {
  userTokenCache.clear();
}

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

/**
 * Verifica o status de conexão com o canal do YouTube do usuário ou global.
 */
export async function getYoutubeConnectionStatus(userId?: number): Promise<{
  isConnected: boolean;
  channelTitle?: string;
  error?: string;
}> {
  try {
    const token = await refreshYoutubeAccessToken(userId);
    if (!token) {
      return { isConnected: false, error: "Nenhum token válido encontrado ou autorização expirada." };
    }

    // Busca detalhes do canal do usuário
    const channelRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!channelRes.ok) {
      return { isConnected: true, channelTitle: undefined };
    }

    const channelData = await channelRes.json();
    const channelTitle = channelData?.items?.[0]?.snippet?.title || undefined;

    return { isConnected: true, channelTitle };
  } catch (err: any) {
    return { isConnected: false, error: err.message };
  }
}

async function downloadToTempFile(url: string): Promise<string> {
  if (url.startsWith("/")) {
    const localPath = path.join(process.cwd(), "public", url);
    if (fs.existsSync(localPath)) return localPath;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar arquivo de mídia: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  const tempDir = os.tmpdir();
  const ext = url.split(".").pop()?.split("?")[0] || "mp4";
  const tempFilePath = path.join(tempDir, `yt-media-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`);
  fs.writeFileSync(tempFilePath, Buffer.from(buffer));
  return tempFilePath;
}

async function transcodeIfNeeded(inputPath: string): Promise<string> {
  let activeFfmpeg = "";
  try {
    const dynamicRequire = eval("require");
    const ffmpegInstaller = dynamicRequire("@ffmpeg-installer/ffmpeg");
    if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
      activeFfmpeg = ffmpegInstaller.path;
    }
  } catch (installerErr) {
    // fallback to system paths
  }

  if (!activeFfmpeg) {
    const ffmpegPaths = ["/opt/homebrew/bin/ffmpeg", "/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
    for (const p of ffmpegPaths) {
      if (fs.existsSync(p)) {
        activeFfmpeg = p;
        break;
      }
    }
  }

  if (!activeFfmpeg) {
    return inputPath;
  }

  const outputPath = inputPath.replace(/\.[^/.]+$/, "") + "-transcoded.mp4";
  try {
    execSync(`"${activeFfmpeg}" -y -i "${inputPath}" -t 140 -r 30 -c:v libx264 -preset superfast -pix_fmt yuv420p -c:a aac -map 0:v:0 -map 0:a? -movflags +faststart "${outputPath}"`, { stdio: "ignore" });
    return outputPath;
  } catch (err) {
    console.error("[YouTube Transcode] Falha na transcodificação, enviando original:", err);
    return inputPath;
  }
}

/**
 * Realiza o upload de um vídeo vertical para o YouTube Shorts.
 */
export async function uploadYoutubeShort(params: {
  userId?: number;
  videoUrl: string;
  title: string;
  description: string;
  tags?: string[];
}): Promise<{
  success: boolean;
  videoId?: string;
  permalink?: string;
  error?: string;
}> {
  const { userId, videoUrl, title, description, tags } = params;

  let tempFile: string | null = null;
  let transcodedFile: string | null = null;

  try {
    const ytAccessToken = await refreshYoutubeAccessToken(userId);
    if (!ytAccessToken) {
      return {
        success: false,
        error: "Canal do YouTube desconectado ou credenciais expiradas. Por favor, conecte seu canal do YouTube.",
      };
    }

    console.log("[YouTube Upload] Baixando arquivo de vídeo:", videoUrl);
    tempFile = await downloadToTempFile(videoUrl);
    transcodedFile = await transcodeIfNeeded(tempFile);

    const videoBuffer = fs.readFileSync(transcodedFile);
    console.log(`[YouTube Upload] Buffer pronto (${videoBuffer.length} bytes). Iniciando sessão resumable...`);

    const metadata = {
      snippet: {
        title: title.substring(0, 100),
        description: description.substring(0, 4500),
        tags: tags || ["Shorts", "RealStock", "Imoveis"],
        categoryId: "22",
      },
      status: {
        privacyStatus: "public",
        selfDeclaredMadeForKids: false,
      },
    };

    const uploadUrlRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ytAccessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": videoBuffer.length.toString(),
          "X-Upload-Content-Type": "video/mp4",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!uploadUrlRes.ok) {
      const errText = await uploadUrlRes.text();
      console.error("[YouTube Upload] Falha ao iniciar upload resumable:", errText);
      return {
        success: false,
        error: `Falha ao iniciar envio no YouTube: ${uploadUrlRes.status} ${errText}`,
      };
    }

    const resumableUrl = uploadUrlRes.headers.get("Location");
    if (!resumableUrl) {
      return {
        success: false,
        error: "URL resumable do YouTube não foi retornada nos cabeçalhos.",
      };
    }

    console.log("[YouTube Upload] Enviando binário do vídeo...");
    const uploadBinaryRes = await fetch(resumableUrl, {
      method: "PUT",
      headers: {
        "Content-Length": videoBuffer.length.toString(),
        "Content-Type": "video/mp4",
      },
      body: videoBuffer,
    });

    if (!uploadBinaryRes.ok) {
      const errText = await uploadBinaryRes.text();
      console.error("[YouTube Upload] Falha no upload binário do YouTube:", errText);
      return {
        success: false,
        error: `Falha no envio do vídeo: ${uploadBinaryRes.status} ${errText}`,
      };
    }

    const uploadData = await uploadBinaryRes.json();
    if (!uploadData.id) {
      return {
        success: false,
        error: "YouTube não retornou o ID do vídeo criado.",
      };
    }

    const videoId = uploadData.id;
    const permalink = `https://youtube.com/shorts/${videoId}`;
    console.log("[YouTube Upload] Sucesso! Shorts publicado:", permalink);

    return {
      success: true,
      videoId,
      permalink,
    };
  } catch (err: any) {
    console.error("[YouTube Upload] Erro inesperado:", err);
    return {
      success: false,
      error: err.message || "Erro desconhecido no upload para o YouTube",
    };
  } finally {
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {}
    }
    if (transcodedFile && transcodedFile !== tempFile && fs.existsSync(transcodedFile)) {
      try {
        fs.unlinkSync(transcodedFile);
      } catch (e) {}
    }
  }
}
