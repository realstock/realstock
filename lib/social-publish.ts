import { prisma } from "./prisma";

export async function publishToInstagram(params: {
  userId: number;
  listingId: number; // 0 for portfolio
  postType: "carousel" | "reels";
  videoUrl?: string | null;
  imageUrls: string[];
  caption: string;
}) {
  const { userId, listingId, postType, videoUrl, imageUrls, caption } = params;

  const igUserId = process.env.INSTAGRAM_IG_USER_ID;
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!igUserId || !igToken) {
    throw new Error("Credenciais do Instagram não configuradas.");
  }

  let finalMediaId = null;

  if (postType === "reels") {
    if (!videoUrl) throw new Error("URL do vídeo não fornecida para Reels.");

    const createMediaRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media?video_url=${encodeURIComponent(
        videoUrl
      )}&media_type=REELS&caption=${encodeURIComponent(caption)}&access_token=${igToken}`,
      { method: "POST" }
    );
    const mediaData = await createMediaRes.json();
    if (!createMediaRes.ok || !mediaData.id) {
      console.error("FB REELS ERROR", mediaData);
      throw new Error("Erro ao criar Reels no Instagram.");
    }
    finalMediaId = mediaData.id;

    // Reels needs status check
    let ready = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const checkRes = await fetch(
        `https://graph.facebook.com/v19.0/${finalMediaId}?fields=status_code&access_token=${igToken}`
      );
      const checkData = await checkRes.json();
      if (checkData.status_code === "FINISHED") {
        ready = true;
        break;
      }
    }
    if (!ready) throw new Error("O vídeo ainda está sendo processado pelo Instagram.");
  } else {
    // Carousel
    if (imageUrls.length === 0) throw new Error("Nenhuma imagem para carrossel.");

    if (imageUrls.length === 1) {
      const createMediaRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(
          imageUrls[0]
        )}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`,
        { method: "POST" }
      );
      const mediaData = await createMediaRes.json();
      if (!createMediaRes.ok || !mediaData.id) throw new Error("Erro ao criar mídia simples no Insta.");
      finalMediaId = mediaData.id;
    } else {
      const childrenIds: string[] = [];
      const uploadPromises = imageUrls.slice(0, 10).map(async (url) => {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(
            url
          )}&is_carousel_item=true&access_token=${igToken}`,
          { method: "POST" }
        );
        const data = await res.json();
        if (!res.ok || !data.id) throw new Error(data.error?.message || "Erro ao upar item do carrossel.");
        return data.id;
      });

      childrenIds.push(...(await Promise.all(uploadPromises)));

      const createCarouselRes = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media?media_type=CAROUSEL&children=${childrenIds.join(
          ","
        )}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`,
        { method: "POST" }
      );
      const carouselData = await createCarouselRes.json();
      if (!createCarouselRes.ok || !carouselData.id) throw new Error("Erro ao criar carrossel no Insta.");
      finalMediaId = carouselData.id;
    }
  }

  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${finalMediaId}&access_token=${igToken}`,
    { method: "POST" }
  );
  const publishData = await publishRes.json();
  if (!publishRes.ok || !publishData.id) {
    throw new Error("Erro ao publicar no Instagram.");
  }

  let permalink = "";
  try {
    const pRes = await fetch(
      `https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${igToken}`
    );
    const pData = await pRes.json();
    if (pData.permalink) permalink = pData.permalink;
  } catch (err) {}

  await prisma.instagramPreviewSession.create({
    data: {
      listingId: listingId,
      status: "PUBLISHED",
      publishedMediaId: publishData.id,
      postType: postType,
      allImageUrls: imageUrls,
      selectedImages: [],
      validationReport: { permalink, isPortfolio: listingId === 0 },
      caption: caption,
    },
  });

  return { success: true, permalink };
}

export async function publishToFacebook(params: {
  userId: number;
  listingId: number; // 0 for portfolio
  postType: "carousel" | "reels";
  videoUrl?: string | null;
  imageUrls: string[];
  caption: string;
}) {
  const { userId, listingId, postType, videoUrl, imageUrls, caption } = params;

  const fbPageId = process.env.FACEBOOK_PAGE_ID;
  const fbToken = process.env.FACEBOOK_ACCESS_TOKEN;

  if (!fbPageId || !fbToken) {
    throw new Error("Credenciais do Facebook não configuradas.");
  }

  let publishedMediaId = "";
  let permalink = "";

  if (postType === "reels") {
    if (!videoUrl) throw new Error("URL do vídeo não fornecida para Reels FB.");

    // 1. Initialize Upload
    const initRes = await fetch(
      `https://graph.facebook.com/v19.0/${fbPageId}/video_reels?upload_phase=start&access_token=${fbToken}`,
      { method: "POST" }
    );
    const initData = await initRes.json();
    if (!initRes.ok || !initData.video_id) throw new Error("Erro ao iniciar Reels FB.");

    const videoId = initData.video_id;

    // 2. Upload by URL (using video_reels with source_url)
    const uploadRes = await fetch(
      `https://graph.facebook.com/v19.0/${fbPageId}/video_reels?upload_phase=finish&video_id=${videoId}&video_state=PUBLISHED&description=${encodeURIComponent(
        caption
      )}&file_url=${encodeURIComponent(videoUrl)}&access_token=${fbToken}`,
      { method: "POST" }
    );
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok || !uploadData.success) throw new Error("Erro ao finalizar Reels FB.");

    publishedMediaId = videoId;
  } else {
    // Carousel (Albums on FB usually)
    // For FB we often just post multiple photos in one post
    const photoIds: string[] = [];
    const uploadPromises = imageUrls.slice(0, 10).map(async (url) => {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${fbPageId}/photos?url=${encodeURIComponent(
          url
        )}&published=false&access_token=${fbToken}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.id) throw new Error("Erro ao upar foto FB.");
      return data.id;
    });

    photoIds.push(...(await Promise.all(uploadPromises)));

    const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${fbPageId}/feed?message=${encodeURIComponent(
        caption
      )}&attached_media=${JSON.stringify(attachedMedia)}&access_token=${fbToken}`,
      { method: "POST" }
    );
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) throw new Error("Erro ao publicar carrossel FB.");

    publishedMediaId = publishData.id;
  }

  // Get permalink
  try {
    const pRes = await fetch(
      `https://graph.facebook.com/v19.0/${publishedMediaId}?fields=permalink_url&access_token=${fbToken}`
    );
    const pData = await pRes.json();
    permalink = pData.permalink_url || "";
  } catch (e) {}

  await prisma.facebookFeedSession.create({
    data: {
      listingId: listingId,
      status: "PUBLISHED",
      publishedPostId: publishedMediaId,
      postType: postType,
      validationReport: { permalink, isPortfolio: listingId === 0 },
      caption: caption,
      allImageUrls: [],
      selectedImages: [],
    },
  });

  return { success: true, permalink };
}
