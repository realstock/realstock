import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const pubId = id;
    const pub = await prisma.adminSponsoredPublication.findUnique({
      where: { id: pubId }
    });

    if (!pub) {
      return NextResponse.json({ success: false, error: "Publication box not found" }, { status: 404 });
    }

    const { selectedPropertyIds } = await req.json(); // Array of property ids to force specific order/subset if wanted

    const targetIds = Array.isArray(selectedPropertyIds) && selectedPropertyIds.length > 0 
      ? selectedPropertyIds.map(Number) 
      : (pub.propertyIds as number[]);

    const properties = await prisma.property.findMany({
      where: { id: { in: targetIds } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } }
    });

    const propertiesWithImages = properties.filter(p => p.images && p.images.length > 0);
    // order the propertiesWithImages based on targetIds
    propertiesWithImages.sort((a, b) => targetIds.indexOf(a.id) - targetIds.indexOf(b.id));

    if (propertiesWithImages.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum imóvel com fotos foi encontrado." }, { status: 400 });
    }

    if (propertiesWithImages.length > 10) {
      return NextResponse.json({ success: false, error: "Limite de 10 imóveis excedido." }, { status: 400 });
    }

    const igUserId = process.env.INSTAGRAM_IG_USER_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!igUserId || !igToken) {
      return NextResponse.json({ success: false, error: "Credenciais do Instagram ausentes enviromnent." }, { status: 500 });
    }

    const captionText = `🔥 Especial Oportunidades - ${pub.name || "RealStock"}\n\nConfira esta seleção VIP de anúncios patrocinados 👉\n\nGaranta a melhor negociação exclusiva acessando o link na nossa bio!`;

    let finalMediaId = null;

    if (propertiesWithImages.length === 1) {
       const createMediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(propertiesWithImages[0].images[0].imageUrl)}&caption=${encodeURIComponent(captionText)}&access_token=${igToken}`, { method: "POST" });
       const mediaData = await createMediaRes.json();
       if (!createMediaRes.ok || !mediaData.id) return NextResponse.json({ success: false, error: "Graph API Err: Mídia" }, { status: 500 });
       finalMediaId = mediaData.id;
    } else {
       const childrenIds: string[] = [];
       const uploadPromises = propertiesWithImages.map(async (p) => {
           const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(p.images[0].imageUrl)}&is_carousel_item=true&access_token=${igToken}`, { method: "POST" });
           const data = await res.json();
           if (!res.ok || !data.id) throw new Error("Graph API item error.");
           return data.id;
       });
       
       const ids = await Promise.all(uploadPromises);
       childrenIds.push(...ids);

       const createCarouselRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?media_type=CAROUSEL&children=${childrenIds.join(',')}&caption=${encodeURIComponent(captionText)}&access_token=${igToken}`, { method: "POST" });
       const carouselData = await createCarouselRes.json();
       if (!createCarouselRes.ok || !carouselData.id) return NextResponse.json({ success: false, error: "Graph API Err: Carrossel" }, { status: 500 });
       finalMediaId = carouselData.id;
    }

    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${finalMediaId}&access_token=${igToken}`, { method: "POST" });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) return NextResponse.json({ success: false, error: "Graph API Err: Publish" }, { status: 500 });

    let permalink = "";
    try {
        const pRes = await fetch(`https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${igToken}`);
        const pData = await pRes.json();
        if (pData.permalink) permalink = pData.permalink;
    } catch(e) {}

    await prisma.instagramPreviewSession.create({
       data: {
         listingId: -2, // Code for Admin Published Boxes
         status: "PUBLISHED",
         publishedMediaId: publishData.id,
         allImageUrls: [],
         selectedImages: [],
         validationReport: { permalink, isSponsoredAdminBox: true },
         caption: pub.id, // Store Box ID in Caption string temporarily so frontend knows which box published
       }
    });

    // VINCULAR DIRETAMENTE NO ANÚNCIO ADMIN
    await prisma.adminSponsoredPublication.update({
       where: { id: pub.id },
       data: {
           instagramMediaId: publishData.id,
           instagramPermalink: permalink
       }
    });

    return NextResponse.json({ success: true, message: "Lote Admin publicado!" });

  } catch (error: any) {
    console.error("ADMIN IG PUBLISH ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
