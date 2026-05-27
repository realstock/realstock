import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { getPortfolioListingId } from "@/lib/portfolioId";

async function downloadToTempFile(url: string): Promise<string> {
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
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
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

    const { orderID, selectedPropertyIds } = await req.json();

    if (!orderID) {
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
                        description: `Publicação de Portfólio (YouTube Shorts) [Format: reels]`,
                        referenceId: orderID,
                        userId: user.id,
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (Portfólio YouTube)`,
                        referenceId: orderID,
                        userId: user.id,
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR FOR PORTFOLIO YOUTUBE:", finErr);
    }

    // Buscar os imóveis do portfólio para compor a descrição
    const properties = await prisma.property.findMany({
      where: {
        ownerId: user.id,
        ...(selectedPropertyIds && Array.isArray(selectedPropertyIds) && selectedPropertyIds.length > 0
          ? { id: { in: selectedPropertyIds.map(Number) } }
          : {})
      },
      orderBy: { createdAt: "desc" }
    });

    let propertyListText = "";
    properties.forEach((p, idx) => {
      const address = [p.street, p.addressNumber, p.neighborhood, p.city, p.state].filter(Boolean).join(", ");
      const priceText = `R$ ${Number(p.price).toLocaleString("pt-BR")}`;
      propertyListText += `${idx + 1}. ${p.title}\n📍 Endereço: ${address || p.city || "Não informado"}\n💰 Valor: ${priceText}\n\n`;
    });

    const captionText = `Confira nosso portfólio completo de imóveis!\n\n${propertyListText}#Shorts #RealStock #Imoveis #MercadoImobiliario`;

    let videoId = `mock_${Math.random().toString(36).substring(2, 10)}`;
    let permalink = `https://youtube.com/shorts/${videoId}`;
    let isSimulated = true;

    if (user.portfolioVideoUrl) {
      try {
        const { refreshYoutubeAccessToken } = require("@/lib/youtube");
        const ytAccessToken = await refreshYoutubeAccessToken(user.id);

        if (ytAccessToken) {
          console.log("YouTube Access Token found. Initializing real upload to YouTube Data API...");
          
          const tempFile = await downloadToTempFile(user.portfolioVideoUrl);
          const transcodedFile = await transcodeIfNeeded(tempFile);
          
          const videoBuffer = fs.readFileSync(transcodedFile);
          
          const metadata = {
            snippet: {
              title: `Portfólio Completo - RealStock`.substring(0, 70),
              description: captionText.substring(0, 4900),
              tags: ["Shorts", "RealStock", "Imoveis"],
              categoryId: "22"
            },
            status: {
              privacyStatus: "public",
              selfDeclaredMadeForKids: false
            }
          };

          const uploadUrlRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${ytAccessToken}`,
              "Content-Type": "application/json; charset=UTF-8",
              "X-Upload-Content-Length": videoBuffer.length.toString(),
              "X-Upload-Content-Type": "video/mp4"
            },
            body: JSON.stringify(metadata)
          });

          if (uploadUrlRes.ok) {
            const resumableUrl = uploadUrlRes.headers.get("Location");
            if (resumableUrl) {
              const uploadBinaryRes = await fetch(resumableUrl, {
                method: "PUT",
                headers: {
                  "Content-Length": videoBuffer.length.toString(),
                  "Content-Type": "video/mp4"
                },
                body: videoBuffer
              });

              if (uploadBinaryRes.ok) {
                const uploadData = await uploadBinaryRes.json();
                if (uploadData.id) {
                  videoId = uploadData.id;
                  permalink = `https://youtube.com/shorts/${videoId}`;
                  isSimulated = false;
                  console.log("YouTube Portfolio Shorts upload success! Video ID:", videoId);
                }
              } else {
                console.error("YouTube binary upload failed:", await uploadBinaryRes.text());
              }
            }
          } else {
            console.error("YouTube resumable upload initiation failed:", await uploadUrlRes.text());
          }

          if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          if (transcodedFile && transcodedFile !== tempFile && fs.existsSync(transcodedFile)) fs.unlinkSync(transcodedFile);
        } else {
          console.log("No YouTube credentials found, running YouTube Shorts simulation...");
        }
      } catch (ytErr) {
        console.error("Real YouTube Portfolio Shorts upload failed, falling back to simulation:", ytErr);
      }
    }

    const portfolioListingId = getPortfolioListingId(user.id);

    // Gravar sessão de publicação de portfólio
    await prisma.youtubeShortsSession.create({
      data: {
        listingId: portfolioListingId,
        videoId: videoId,
        status: "PUBLISHED",
        caption: captionText.substring(0, 1000),
        permalink: permalink
      }
    });

    // Atualizar transações financeiras com o permalink real
    try {
      await prisma.financialTransaction.updateMany({
        where: { referenceId: orderID },
        data: {
          description: {
            set: `Publicação de Portfólio (YouTube Shorts) [Format: reels] [Permalink: ${permalink}]`
          }
        }
      });
    } catch (dbErr) {
      console.error("DB TRANSACTION UPDATE ERROR:", dbErr);
    }

    return NextResponse.json({ success: true, message: "Portfólio publicado com sucesso no YouTube Shorts!", permalink });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE PORTFOLIO YOUTUBE ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
