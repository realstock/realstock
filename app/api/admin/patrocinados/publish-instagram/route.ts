import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 401 });
    }

    const { selectedPropertyIds } = await req.json();

    if (!Array.isArray(selectedPropertyIds) || selectedPropertyIds.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum imóvel selecionado." }, { status: 400 });
    }

    if (selectedPropertyIds.length > 10) {
      return NextResponse.json({ success: false, error: "O limite do Instagram é de 10 fotos por carrossel." }, { status: 400 });
    }

    const properties = await prisma.property.findMany({
      where: { 
         id: { in: selectedPropertyIds.map(Number) }
      },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });

    const propertiesWithImages = properties.filter(p => p.images && p.images.length > 0);

    if (propertiesWithImages.length === 0) {
        return NextResponse.json({ success: false, error: "Nenhum anúncio com foto encontrado para o portfólio." }, { status: 400 });
    }

    const igUserId = process.env.INSTAGRAM_IG_USER_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!igUserId || !igToken) {
      return NextResponse.json({ success: false, error: "Credenciais do Instagram não configuradas." }, { status: 500 });
    }

    const caption = `🌟 Portfólio PREMIUM da RealStock!\n\nConfira os melhores imóveis patrocinados neste super carrossel! 👉\n\nAcesse nosso site (Link na bio) e encontre seu imóvel ideal.`;

    let finalMediaId = null;

    if (propertiesWithImages.length === 1) {
       const createMediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(propertiesWithImages[0].images[0].imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, { method: "POST" });
       const mediaData = await createMediaRes.json();
       if (!createMediaRes.ok || !mediaData.id) return NextResponse.json({ success: false, error: "Erro ao criar mídia." }, { status: 500 });
       finalMediaId = mediaData.id;
    } else {
       const childrenIds: string[] = [];
       try {
           const uploadPromises = propertiesWithImages.map(async (prop) => {
               const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(prop.images[0].imageUrl)}&is_carousel_item=true&access_token=${igToken}`, { method: "POST" });
               const data = await res.json();
               if (!res.ok || !data.id) throw new Error(data.error?.message || "Erro desconhecido ao upar item.");
               return data.id;
           });
           
           const ids = await Promise.all(uploadPromises);
           childrenIds.push(...ids);
       } catch (err: any) {
           return NextResponse.json({ success: false, error: "Erro ao upar imagens para o carrossel: " + err.message }, { status: 500 });
       }

       const captureParam = childrenIds.join(",");
       const carouselRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?media_type=CAROUSEL&children=${captureParam}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, { method: "POST" });
       const carouselData = await carouselRes.json();
       
       if (!carouselRes.ok || !carouselData.id) {
           return NextResponse.json({ success: false, error: "Erro ao agrupar carrossel." }, { status: 500 });
       }
       finalMediaId = carouselData.id;
    }

    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${finalMediaId}&access_token=${igToken}`, { method: "POST" });
    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
         return NextResponse.json({ success: false, error: "Erro crítico ao Publicar carrossel." }, { status: 500 });
    }

    const idDataRequest = await fetch(`https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${igToken}`);
    const mediaDetails = await idDataRequest.json();

    await prisma.instagramPreviewSession.create({
       data: {
          listingId: -1,
          caption: caption,
          status: "PUBLISHED",
          allImageUrls: propertiesWithImages.map(p => p.images[0].imageUrl),
          selectedImages: propertiesWithImages.map(p => p.images[0].imageUrl),
          publishedMediaId: publishData.id,
          validationReport: {
             permalink: mediaDetails.permalink || `https://instagram.com/p/${publishData.id}`,
             success: true
          }
       }
    });

    return NextResponse.json({ success: true, message: "Portfólio Global impulsionado com sucesso!" });
  } catch (error: any) {
    console.error("CAPTURE ADMIN IG PORTFOLIO ERROR:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}
