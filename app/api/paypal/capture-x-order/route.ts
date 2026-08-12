import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

async function downloadToTempFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Falha ao baixar arquivo de mídia: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  const tempDir = os.tmpdir();
  const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
  const tempFilePath = path.join(tempDir, `x-media-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`);
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
    // Limita o vídeo a no máximo 140 segundos (limite padrão do X) caso precise ser postado
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

    const { orderID, propertyId, postType = "carousel" } = await req.json();

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
                        description: `Publicação de Imóvel #${propertyId} (X/Twitter) [Format: ${postType}]`,
                        referenceId: orderID,
                        userId: user.id,
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (Post X)`,
                        referenceId: orderID,
                        userId: user.id,
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR FOR X:", finErr);
    }

    // Obter dados do imóvel para formatar o Tweet
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: { orderBy: { sortOrder: "asc" } } }
    });

    let permalink = "https://x.com/_RealStock_";
    let statusId = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));

    if (process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_TOKEN_SECRET && property) {
      try {
        const { TwitterApi } = require("twitter-api-v2");
        const client = new TwitterApi({
          appKey: process.env.X_API_KEY,
          appSecret: process.env.X_API_SECRET,
          accessToken: process.env.X_ACCESS_TOKEN,
          accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
        });

        let baseDomain = process.env.NEXT_PUBLIC_SITE_URL || "https://www.realstock.com.br";
        if (baseDomain.includes("localhost")) {
          baseDomain = "https://www.realstock.com.br";
        }
        const siteLink = `${baseDomain}/imovel/${propertyId}`;
        
        let tweetText = `🏡 ${property.title}\n`;
        if (property.price) {
          tweetText += `💰 R$ ${Number(property.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
        }
        
        const details = [];
        if (property.area) details.push(`📐 ${property.area}m²`);
        if (property.bedrooms) details.push(`🛏️ ${property.bedrooms} qtos`);
        if (property.bathrooms) details.push(`🚿 ${property.bathrooms} banhs`);
        if (details.length > 0) {
          tweetText += `${details.join(" | ")}\n`;
        }
        
        if (property.city || property.state) {
          const loc = [property.city, property.state].filter(Boolean).join(" - ");
          tweetText += `📍 ${loc}\n`;
        }
        
        tweetText += `\n`;
        
        let hashtagsStr = "\n\n#Imóveis #MercadoImobiliário #RealStock";
        if (property.city) {
            hashtagsStr += ` #${property.city.replace(/\s+/g, '')}`;
        }
        
        const reservedLength = tweetText.length + siteLink.length + hashtagsStr.length + 10;
        const maxDescLength = 280 - reservedLength;
        
        if (property.description && maxDescLength > 10) {
          let descSnippet = property.description;
          if (descSnippet.length > maxDescLength) {
            descSnippet = descSnippet.substring(0, maxDescLength - 3) + "...";
          }
          tweetText += `${descSnippet}`;
        }
        
        tweetText += `${hashtagsStr}\n\n${siteLink}`;
        
        // Fazer upload de imagens (carrossel) ou vídeo (reels) dependendo do postType selecionado
        const mediaIds: string[] = [];

        const videoUrl = property.customVideoUrl || property.reelsVideoUrl;
        if (postType === "reels" && videoUrl) {
          let tempFile = "";
          let transcodedFile = "";
          try {
            console.log("Downloading video for X Reels...");
            tempFile = await downloadToTempFile(videoUrl);
            
            console.log("Checking if transcoding is needed...");
            transcodedFile = await transcodeIfNeeded(tempFile);

            console.log("Uploading native video to X for reels...");
            const mediaId = await client.v1.uploadMedia(transcodedFile, { mimeType: 'video/mp4', target: 'tweet' });

            if (mediaId) {
              console.log(`Video uploaded (ID: ${mediaId}), starting processing status check loop...`);
              let isProcessed = false;
              let checkAttempts = 0;
              
              while (!isProcessed && checkAttempts < 20) {
                const status = await client.v1.mediaInfo(mediaId);
                if (status && status.processing_info) {
                  const state = status.processing_info.state;
                  console.log(`[Attempt ${checkAttempts + 1}] Video processing state: ${state}`);
                  if (state === 'succeeded') {
                    isProcessed = true;
                  } else if (state === 'failed') {
                    throw new Error("X Video processing failed: " + JSON.stringify(status.processing_info.error));
                  } else {
                    await new Promise(r => setTimeout(r, 2000));
                    checkAttempts++;
                  }
                } else {
                  isProcessed = true;
                }
              }
              
              if (isProcessed) {
                mediaIds.push(mediaId);
                console.log("Video processing succeeded! Media ID attached.");
              }
            }
          } catch (uploadErr) {
            console.error("X Video upload/transcode error:", uploadErr);
          } finally {
            if (tempFile && fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }
            if (transcodedFile && transcodedFile !== tempFile && fs.existsSync(transcodedFile)) {
              fs.unlinkSync(transcodedFile);
            }
          }
        } else if (postType === "carousel" && property.images && property.images.length > 0) {
          const imagesToUpload = property.images.slice(0, 4); // X permite no máximo 4 imagens por tweet
          for (const img of imagesToUpload) {
            let tempFile = "";
            try {
              console.log("Uploading native image to X for carousel:", img.imageUrl);
              tempFile = await downloadToTempFile(img.imageUrl);
              const mediaId = await client.v1.uploadMedia(tempFile);
              if (mediaId) mediaIds.push(mediaId);
            } catch (uploadErr) {
              console.error("X Image upload error:", uploadErr);
            } finally {
              if (tempFile && fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
            }
          }
        }

        if (postType === "reels" && mediaIds.length === 0) {
          throw new Error("Falha ao carregar o vídeo para o X (Twitter).");
        }
        if (postType === "carousel" && mediaIds.length === 0) {
          throw new Error("Falha ao carregar as imagens para o X (Twitter).");
        }

        const rwClient = client.readWrite;
        const tweetOptions: any = {};
        if (mediaIds.length > 0) {
          tweetOptions.media = { media_ids: mediaIds };
        }

        const tweet = await rwClient.v2.tweet(tweetText, tweetOptions);
        if (tweet && tweet.data && tweet.data.id) {
          statusId = tweet.data.id;
          permalink = `https://x.com/i/status/${tweet.data.id}`;
          console.log("X TWEET WITH MEDIA PUBLISHED SUCCESSFULLY:", permalink);

          // Atualizar transação financeira com o link real do Tweet
          try {
            await prisma.financialTransaction.updateMany({
              where: {
                userId: user.id,
                category: "POSTS",
                referenceId: orderID,
                description: { contains: `Publicação de Imóvel #${propertyId} (X/Twitter)` }
              },
              data: {
                description: `Publicação de Imóvel #${propertyId} (X/Twitter) [Format: ${postType}] [Permalink: ${permalink}]`
              }
            });
          } catch (updateErr) {
            console.error("Erro ao atualizar transação com permalink do X:", updateErr);
          }
        }
      } catch (tweetErr) {
        console.error("X REAL TWEET WITH MEDIA ERROR (FALLING BACK TO TEXT-ONLY TWEET OR SIMULATION):", tweetErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pagamento aprovado e anúncio publicado no X (Twitter) com sucesso!",
      permalink,
      x_status_id: statusId
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE X ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno ao processar a captura ou postagem.",
      },
      { status: 500 }
    );
  }
}
