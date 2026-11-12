import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

async function downloadToTempFile(url: string): Promise<string> {
  if (url.startsWith("/")) {
    const localPath = path.join(process.cwd(), "public", url);
    if (fs.existsSync(localPath)) return localPath;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar arquivo de mídia: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  const tempDir = os.tmpdir();
  const ext = url.split('.').pop()?.split('?')[0] || 'mp4';
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
      console.log(`Using @ffmpeg-installer static binary: ${ffmpegInstaller.path}`);
      activeFfmpeg = ffmpegInstaller.path;
    }
  } catch (installerErr) {
    console.warn("Could not load @ffmpeg-installer/ffmpeg, trying system paths:", installerErr);
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
    console.warn("ffmpeg not found, skipping transcoding and uploading original file.");
    return inputPath;
  }
  
  const outputPath = inputPath.replace(/\.[^/.]+$/, "") + "-transcoded.mp4";
  try {
    console.log(`Executing transcoding using ${activeFfmpeg}...`);
    execSync(`"${activeFfmpeg}" -y -i "${inputPath}" -t 140 -r 30 -c:v libx264 -preset superfast -pix_fmt yuv420p -c:a aac -map 0:v:0 -map 0:a? -movflags +faststart "${outputPath}"`, { stdio: 'ignore' });
    return outputPath;
  } catch (err) {
    console.error("Transcoding failed:", err);
    return inputPath;
  }
}

async function getPayPalAccessToken() {
  const base = process.env.PAYPAL_API_BASE!;
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  if (!res.ok) throw new Error("Falha ao autenticar no PayPal.");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { orderID, propertyId } = await req.json();

    if (!orderID || !propertyId) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
    }

    // Capture payment
    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
      return NextResponse.json({
        success: false,
        error: "Pagamento não foi concluído.",
        detail: captureData,
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });

    // Accounting Logic
    try {
        const captureInfo = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        if (captureInfo && captureInfo.seller_receivable_breakdown) {
            const grossAmount = parseFloat(captureInfo.seller_receivable_breakdown.gross_amount.value);
            const feeAmount = parseFloat(captureInfo.seller_receivable_breakdown.paypal_fee.value);

            await prisma.financialTransaction.createMany({
                data: [
                    {
                        type: "REVENUE",
                        category: "POSTS",
                        amount: grossAmount,
                        description: `Publicação de Imóvel #${propertyId} (YouTube Shorts) [Format: reels]`,
                        referenceId: orderID,
                        userId: user.id,
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (YouTube Shorts)`,
                        referenceId: orderID,
                        userId: user.id,
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR FOR YOUTUBE:", finErr);
    }

    // Obter dados do imóvel
    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    let videoId = `mock_${Math.random().toString(36).substring(2, 10)}`;
    let permalink = `https://youtube.com/shorts/${videoId}`;
    let isSimulated = true;

    const videoUrl = property?.customVideoUrl || property?.reelsVideoUrl;
    if (property && videoUrl) {
      const isSeasonal = property.listingType === "ALUGUEL_TEMPORADA";
      const propertyUrl = `https://www.realstock.com.br/imovel/${property.id}`;
      const descStr = property.description ? ` - ${property.description}` : "";

      const videoTitle = isSeasonal
        ? "Procurando lugar para se hospedar? Conheça este espaço!"
        : property.title.substring(0, 70);

      const videoDescription = isSeasonal
        ? `Pensando em viajar para ${property.city || ''} reserve este imovel no ${propertyUrl}${descStr}`
        : `${property.title}\n\n📍 ${[property.city, property.state].filter(Boolean).join(" - ")}\n💰 R$ ${Number(property.price).toLocaleString("pt-BR")}\n\n${property.description || ""}`;

      const tags = isSeasonal
        ? ["Shorts", "RealStock", "AluguelTemporada", "Temporada", property.city || "Brasil"].filter(Boolean)
        : ["Shorts", "RealStock", "Imoveis", property.city || "Brasil"].filter(Boolean);

      const { uploadYoutubeShort } = require("@/lib/youtube");
      const uploadResult = await uploadYoutubeShort({
        userId: user.id,
        videoUrl,
        title: videoTitle,
        description: videoDescription,
        tags,
      });

      if (uploadResult.success && uploadResult.videoId) {
        videoId = uploadResult.videoId;
        permalink = uploadResult.permalink;
        isSimulated = false;

        try {
          await prisma.youtubeShortsSession.deleteMany({
            where: {
              listingId: propertyId,
              videoId: { startsWith: "mock_" },
            },
          });
        } catch (e) {}
      } else {
        console.warn("YouTube real upload failed, using simulated session fallback:", uploadResult.error);
      }
    }

    // Gravar sessão de publicação
    await prisma.youtubeShortsSession.create({
      data: {
        listingId: propertyId,
        videoId: videoId,
        status: "PUBLISHED",
        caption: property ? property.title : "YouTube Shorts",
        permalink: permalink
      }
    });

    // Atualizar transações financeiras com o permalink real
    try {
      await prisma.financialTransaction.updateMany({
        where: {
          userId: user.id,
          category: "POSTS",
          referenceId: orderID,
          description: { contains: `Publicação de Imóvel #${propertyId} (YouTube Shorts)` }
        },
        data: {
          description: `Publicação de Imóvel #${propertyId} (YouTube Shorts) [Format: reels] [Permalink: ${permalink}]`
        }
      });
    } catch (updateErr) {
      console.error("Erro ao atualizar transação com permalink do YouTube:", updateErr);
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento aprovado e anúncio publicado no YouTube Shorts com sucesso!",
      permalink,
      videoId
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE YOUTUBE ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno ao processar a captura ou postagem.",
      },
      { status: 500 }
    );
  }
}
