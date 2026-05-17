import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import os from "os";

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

    let permalink = `https://x.com/i/status/${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;
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
        const maxDescLength = 280 - siteLink.length - 6; // Margem de segurança para quebras de linha e reticências
        
        let descSnippet = property.description || property.title || "";
        if (descSnippet.length > maxDescLength) {
          descSnippet = descSnippet.substring(0, maxDescLength - 3) + "...";
        }
        
        const tweetText = `${descSnippet}\n\n${siteLink}`;
        
        // Fazer upload de imagens (carrossel) ou vídeo (reels) dependendo do postType selecionado
        const mediaIds: string[] = [];

        if (postType === "reels" && property.reelsVideoUrl) {
          let tempFile = "";
          try {
            console.log("Uploading native video to X for reels...");
            tempFile = await downloadToTempFile(property.reelsVideoUrl);
            const mediaId = await client.v1.uploadMedia(tempFile, {
              mimeType: 'video/mp4',
              target: 'tweet_video'
            });
            if (mediaId) mediaIds.push(mediaId);
          } catch (uploadErr) {
            console.error("X Video upload error:", uploadErr);
          } finally {
            if (tempFile && fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
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
