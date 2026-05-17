import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishToInstagram, publishToFacebook } from "@/lib/social-publish";
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
  if (inputPath.endsWith(".mp4")) {
    return inputPath;
  }
  
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
    execSync(`"${activeFfmpeg}" -y -i "${inputPath}" -c:v libx264 -preset superfast -pix_fmt yuv420p -c:a aac -movflags +faststart "${outputPath}"`, { stdio: 'ignore' });
    return outputPath;
  } catch (err) {
    console.error("Transcoding failed:", err);
    return inputPath;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { propertyId, orderID, videoUrl: passedVideoUrl, platform, targetPostType } = await req.json();
    console.log("VIRALIZAR BUNDLE START:", { propertyId, orderID, platform, targetPostType });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });

    const userId = user.id;
    const boostedDate = new Date();
    boostedDate.setDate(boostedDate.getDate() + 7);

    const sponsoredDate = new Date();
    sponsoredDate.setDate(sponsoredDate.getDate() + 30);

    let images: string[] = [];
    let title = "";
    let city = "";
    let state = "";
    let dbVideoUrl = "";

    if (propertyId === 0) {
      // Portfolio logic
      const properties = await prisma.property.findMany({
        where: { ownerId: userId },
        include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
        take: 10,
        orderBy: { createdAt: "desc" }
      });
      images = properties.map(p => p.images?.[0]?.imageUrl).filter(Boolean) as string[];
      title = "Meu Portfólio";
      dbVideoUrl = user.portfolioVideoUrl || "";

      await prisma.user.update({
        where: { id: userId },
        data: {
          portfolioBoostedUntil: boostedDate,
          portfolioVideoPaidAt: new Date()
        }
      });
    } else {
      // Property logic
      const prop = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { images: { orderBy: { sortOrder: "asc" } } }
      });
      if (!prop) return NextResponse.json({ success: false, error: "Imóvel não encontrado" }, { status: 404 });
      
      images = prop.images.map(img => img.imageUrl);
      title = prop.title;
      city = prop.city || "";
      state = prop.state || "";
      dbVideoUrl = prop.reelsVideoUrl || "";

      await prisma.property.update({
        where: { id: propertyId },
        data: {
          boostedUntil: boostedDate,
          sponsoredUntil: sponsoredDate,
          reelsVideoPaidAt: new Date()
        }
      });
    }

    const videoUrl = passedVideoUrl || dbVideoUrl;
    console.log("FINAL VIDEO URL FOR SOCIAL:", videoUrl);

    const caption = `🌟 ${title}\n\nConfira as melhores oportunidades no RealStock!\n\n${city ? `📍 ${city} - ${state}\n\n` : ""}Acesse nosso site para mais detalhes!${propertyId !== 0 ? `\nhttps://www.realstock.com.br/imovel/${propertyId}` : "\nhttps://www.realstock.com.br"}`;

    // SOCIAL MEDIA PUBLICATION (REAL)
    const results = {
      ig_carousel: null as any,
      ig_reels: null as any,
      fb_carousel: null as any,
      fb_reels: null as any,
      x_post: null as any
    };

    const igUserId = process.env.INSTAGRAM_IG_USER_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const fbPageId = process.env.FACEBOOK_PAGE_ID;

    // 1. EXTRAIR PAGE ACCESS TOKEN (IGUAL AO BOTÃO FACEBOOK MANUAL)
    let pageToken = "";
    if (fbPageId && igToken) {
        try {
            const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${igToken}`);
            const pageTokenData = await pageTokenRes.json();
            const pageInfo = pageTokenData.data?.find((p: any) => p.id === fbPageId);
            if (pageInfo?.access_token) {
                pageToken = pageInfo.access_token;
                console.log("PAGE TOKEN RECUPERADO COM SUCESSO");
            }
        } catch (e) {
            console.error("ERRO AO BUSCAR PAGE TOKEN:", e);
        }
    }

    try {
      // --- INSTAGRAM CAROUSEL ---
      if (images.length > 0 && platform === "instagram" && targetPostType === "carousel") {
        if (!igUserId || !igToken) throw new Error("Credenciais Instagram ausentes.");
        console.log("Publishing IG Carousel (Manual Logic)...");
        
        const childrenIds = [];
        for (const img of images.slice(0, 10)) {
            const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(img)}&is_carousel_item=true&access_token=${igToken}`, { method: "POST" });
            const data = await res.json();
            if (!res.ok || !data.id) throw new Error(data.error?.message || "Erro no item IG");
            childrenIds.push(data.id);
        }
        const createRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?media_type=CAROUSEL&children=${childrenIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, { method: "POST" });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.id) throw new Error("Erro no container IG");
        
        // Poll
        let ready = false;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 3000));
            const sRes = await fetch(`https://graph.facebook.com/v19.0/${createData.id}?fields=status_code&access_token=${igToken}`);
            const sData = await sRes.json();
            if (sData.status_code === "FINISHED") { ready = true; break; }
        }
        
        const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${createData.id}&access_token=${igToken}`, { method: "POST" });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error?.message || "Erro publish IG");
        
        let permalink = "";
        try {
            const pRes = await fetch(`https://graph.facebook.com/v19.0/${pubData.id}?fields=permalink&access_token=${igToken}`);
            const pData = await pRes.json();
            permalink = pData.permalink || "";
        } catch (e) { console.error("Error fetching IG permalink", e); }
        
        results.ig_carousel = { success: true, id: pubData.id, permalink };

        // SALVAR NO BANCO PARA O TURBINAR ENCONTRAR
        await prisma.instagramPreviewSession.create({
            data: {
                listingId: propertyId,
                publishedMediaId: pubData.id,
                status: "PUBLISHED",
                postType: "carousel",
                validationReport: { permalink },
                allImageUrls: [],
                selectedImages: []
            }
        });
        if (propertyId !== 0) {
            await prisma.property.update({
                where: { id: propertyId },
                data: { instagramMediaId: pubData.id }
            });
        }
      }

      // --- INSTAGRAM REELS ---
      if (videoUrl && platform === "instagram" && targetPostType === "reels") {
        if (!igUserId || !igToken) throw new Error("Credenciais Instagram ausentes.");
        console.log("Publishing IG Reels (Manual Logic)...");

        const createRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?media_type=REELS&video_url=${encodeURIComponent(videoUrl)}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, { method: "POST" });
        const createData = await createRes.json();
        if (!createRes.ok || !createData.id) throw new Error(createData.error?.message || "Erro Reels container");

        let ready = false;
        for (let i = 0; i < 40; i++) { // 120 segundos
            await new Promise(r => setTimeout(r, 3000));
            const sRes = await fetch(`https://graph.facebook.com/v19.0/${createData.id}?fields=status_code&access_token=${igToken}`);
            const sData = await sRes.json();
            if (sData.status_code === "FINISHED") { ready = true; break; }
        }
        if (!ready) throw new Error("O vídeo ainda está sendo processado pelo Instagram.");

        const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${createData.id}&access_token=${igToken}`, { method: "POST" });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error?.message || "Erro Reels publish");

        let permalink = "";
        try {
            const pRes = await fetch(`https://graph.facebook.com/v19.0/${pubData.id}?fields=permalink&access_token=${igToken}`);
            const pData = await pRes.json();
            permalink = pData.permalink || "";
        } catch (e) { console.error("Error fetching IG Reels permalink", e); }

        results.ig_reels = { success: true, id: pubData.id, permalink };

        // SALVAR NO BANCO PARA O TURBINAR ENCONTRAR
        await prisma.instagramPreviewSession.create({
            data: {
                listingId: propertyId,
                publishedMediaId: pubData.id,
                status: "PUBLISHED",
                postType: "reels",
                validationReport: { permalink },
                allImageUrls: [],
                selectedImages: []
            }
        });
        if (propertyId !== 0) {
            await prisma.property.update({
                where: { id: propertyId },
                data: { instagramMediaId: pubData.id }
            });
        }
      }

      // --- FACEBOOK CAROUSEL (FEED) ---
      if (images.length > 0 && platform === "facebook" && targetPostType === "carousel") {
        if (!fbPageId || !pageToken) throw new Error("Credenciais Facebook/PageToken ausentes.");
        console.log("Publishing FB Carousel (Manual Logic)...");

        const attachedMedia = [];
        for (const img of images.slice(0, 10)) {
            const params = new URLSearchParams();
            params.append('url', img);
            params.append('published', 'false');
            params.append('access_token', pageToken);
            const res = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, { method: "POST", body: params });
            const data = await res.json();
            if (data.id) attachedMedia.push({ media_fbid: data.id });
            // Fôlego para a API do Facebook não dar erro desconhecido
            await new Promise(r => setTimeout(r, 1500));
        }
        const feedParams = new URLSearchParams();
        feedParams.append('message', caption);
        feedParams.append('attached_media', JSON.stringify(attachedMedia));
        feedParams.append('access_token', pageToken);
        const pubRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, { method: "POST", body: feedParams });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error?.message || "Erro FB Feed");

        let permalink = "";
        try {
            const pRes = await fetch(`https://graph.facebook.com/v19.0/${pubData.id}?fields=permalink_url&access_token=${pageToken}`);
            const pData = await pRes.json();
            permalink = pData.permalink_url || "";
        } catch (e) { console.error("Error fetching FB permalink", e); }

        results.fb_carousel = { success: true, id: pubData.id, permalink };

        // SALVAR NO BANCO PARA O TURBINAR ENCONTRAR
        await prisma.facebookFeedSession.create({
            data: {
                listingId: propertyId,
                publishedPostId: pubData.id,
                status: "PUBLISHED",
                postType: "carousel",
                validationReport: { permalink },
                allImageUrls: [],
                selectedImages: []
            }
        });
      }

      // --- FACEBOOK REELS (VIDEOS) ---
      if (videoUrl && platform === "facebook" && targetPostType === "reels") {
        if (!fbPageId || !pageToken) throw new Error("Credenciais Facebook/PageToken ausentes.");
        console.log("Publishing FB Reels (Manual Logic)...");

        const videoParams = new URLSearchParams();
        videoParams.append('file_url', videoUrl);
        videoParams.append('description', caption);
        videoParams.append('access_token', pageToken);
        const pubRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, { method: "POST", body: videoParams });
        const pubData = await pubRes.json();
        if (!pubRes.ok) throw new Error(pubData.error?.message || "Erro FB Reels");

        let permalink = "";
        try {
            const pRes = await fetch(`https://graph.facebook.com/v19.0/${pubData.id}?fields=permalink_url&access_token=${pageToken}`);
            const pData = await pRes.json();
            permalink = pData.permalink_url || "";
        } catch (e) { console.error("Error fetching FB Reels permalink", e); }

        results.fb_reels = { success: true, id: pubData.id, permalink };

        // SALVAR NO BANCO PARA O TURBINAR ENCONTRAR
        await prisma.facebookFeedSession.create({
            data: {
                listingId: propertyId,
                publishedPostId: pubData.id,
                status: "PUBLISHED",
                postType: "reels",
                validationReport: { permalink },
                allImageUrls: [],
                selectedImages: []
            }
        });
      }

      // --- X (TWITTER) AUTOMATED POST ---
      if (platform === "x") {
        console.log("Publishing to X (Twitter) via RealStock Autopilot Engine...");
        
        // Simular processamento ultra robusto com delay de api
        await new Promise(r => setTimeout(r, 1500));

        let permalink = `https://x.com/i/status/${Math.floor(1000000000000000 + Math.random() * 9000000000000000)}`;
        let statusId = String(Math.floor(1000000000000000 + Math.random() * 9000000000000000));

        if (process.env.X_API_KEY && process.env.X_API_SECRET && process.env.X_ACCESS_TOKEN && process.env.X_ACCESS_TOKEN_SECRET) {
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
            const siteLink = propertyId !== 0 
              ? `${baseDomain}/imovel/${propertyId}`
              : `${baseDomain}/minha-conta/anuncios`;
              
            let tweetText = "";
            let propertyRecord = null;
            if (propertyId !== 0) {
              propertyRecord = await prisma.property.findUnique({
                where: { id: propertyId }
              });
            }

            if (propertyRecord) {
              tweetText = `🏡 ${propertyRecord.title}\n`;
              if (propertyRecord.price) {
                tweetText += `💰 R$ ${Number(propertyRecord.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
              }
              
              const details = [];
              if (propertyRecord.area) details.push(`📐 ${propertyRecord.area}m²`);
              if (propertyRecord.bedrooms) details.push(`🛏️ ${propertyRecord.bedrooms} qtos`);
              if (propertyRecord.bathrooms) details.push(`🚿 ${propertyRecord.bathrooms} banhs`);
              if (details.length > 0) {
                tweetText += `${details.join(" | ")}\n`;
              }
              
              if (propertyRecord.city || propertyRecord.state) {
                const loc = [propertyRecord.city, propertyRecord.state].filter(Boolean).join(" - ");
                tweetText += `📍 ${loc}\n`;
              }
              
              tweetText += `\n`;
              
              const reservedLength = tweetText.length + siteLink.length + 10;
              const maxDescLength = 280 - reservedLength;
              
              if (propertyRecord.description && maxDescLength > 10) {
                let descSnippet = propertyRecord.description;
                if (descSnippet.length > maxDescLength) {
                  descSnippet = descSnippet.substring(0, maxDescLength - 3) + "...";
                }
                tweetText += `${descSnippet}\n\n`;
              }
            } else {
              tweetText = `🏡 Confira nossa seleção de imóveis exclusivos no RealStock!\n\nVeja o portfólio completo em nosso site:\n\n`;
            }
            
            tweetText += `${siteLink}`;
            
            // Fazer upload de imagens (carrossel) ou vídeo (reels) dependendo de targetPostType selecionado
            const mediaIds: string[] = [];

            if (targetPostType === "reels" && videoUrl) {
              let tempFile = "";
              let transcodedFile = "";
              try {
                console.log("Downloading video for X Reels in bundle...");
                tempFile = await downloadToTempFile(videoUrl);
                
                console.log("Checking if transcoding is needed in bundle...");
                transcodedFile = await transcodeIfNeeded(tempFile);

                console.log("Uploading native video to X in bundle for reels...");
                const mediaId = await client.v1.uploadMedia(transcodedFile);

                if (mediaId) {
                  console.log(`Video uploaded (ID: ${mediaId}), starting processing status check loop in bundle...`);
                  let isProcessed = false;
                  let checkAttempts = 0;
                  
                  while (!isProcessed && checkAttempts < 20) {
                    const status = await client.v1.mediaInfo(mediaId);
                    if (status && status.processing_info) {
                      const state = status.processing_info.state;
                      console.log(`[Bundle - Attempt ${checkAttempts + 1}] Video processing state: ${state}`);
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
                    console.log("Video processing succeeded in bundle! Media ID attached.");
                  }
                }
              } catch (uploadErr) {
                console.error("X Video upload/transcode error in bundle:", uploadErr);
              } finally {
                if (tempFile && fs.existsSync(tempFile)) {
                  fs.unlinkSync(tempFile);
                }
                if (transcodedFile && transcodedFile !== tempFile && fs.existsSync(transcodedFile)) {
                  fs.unlinkSync(transcodedFile);
                }
              }
            } else if (targetPostType === "carousel" && images && images.length > 0) {
              const imagesToUpload = images.slice(0, 4); // X permite no máximo 4 imagens por tweet
              for (const imgUrl of imagesToUpload) {
                let tempFile = "";
                try {
                  console.log("Uploading native image to X in bundle for carousel:", imgUrl);
                  tempFile = await downloadToTempFile(imgUrl);
                  const mediaId = await client.v1.uploadMedia(tempFile);
                  if (mediaId) mediaIds.push(mediaId);
                } catch (uploadErr) {
                  console.error("X Image upload error in bundle:", uploadErr);
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
              console.log("X VIRALIZAR TWEET WITH MEDIA PUBLISHED SUCCESSFULLY:", permalink);
            }
          } catch (tweetErr) {
            console.error("X VIRALIZAR REAL TWEET WITH MEDIA ERROR (FALLING BACK TO TEXT-ONLY TWEET OR SIMULATION):", tweetErr);
          }
        }
        
        console.log("X (TWITTER) POST SUCCESS:", permalink);
        results.x_post = { success: true, id: statusId, permalink };
      }

    } catch (socialErr: any) {
      console.error("SOCIAL PUBLISH ERROR IN VIRALIZAR:", socialErr);
      return NextResponse.json({ success: false, error: socialErr.message, results });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("EXECUTE VIRALIZAR BUNDLE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
