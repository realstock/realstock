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

    const { selectedPropertyIds } = await req.json();

    const targetIds = Array.isArray(selectedPropertyIds) && selectedPropertyIds.length > 0 
      ? selectedPropertyIds.map(Number) 
      : (pub.propertyIds as number[]);

    const properties = await prisma.property.findMany({
      where: { id: { in: targetIds } },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } }
    });

    const propertiesWithImages = properties.filter(p => p.images && p.images.length > 0);
    propertiesWithImages.sort((a, b) => targetIds.indexOf(a.id) - targetIds.indexOf(b.id));

    if (propertiesWithImages.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum imóvel com fotos foi encontrado." }, { status: 400 });
    }

    if (propertiesWithImages.length > 10) {
      return NextResponse.json({ success: false, error: "Limite de 10 fotos excedido para Facebook." }, { status: 400 });
    }

    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;

    if (!pageId || !igToken) {
      return NextResponse.json({ success: false, error: "Credenciais do Facebook não configuradas." }, { status: 500 });
    }

    const BASE_GRAPH = "https://graph.facebook.com/v19.0";

    const pageTokenRes = await fetch(`${BASE_GRAPH}/me/accounts?access_token=${igToken}`);
    const pageTokenData = await pageTokenRes.json();
    const pageInfo = pageTokenData.data?.find((p: any) => p.id === pageId);
    
    if (!pageInfo || !pageInfo.access_token) {
        return NextResponse.json({
          success: false,
          error: "Não foi possível recuperar o Page Token do Facebook."
        }, { status: 500 });
    }
    
    const pageToken = pageInfo.access_token;
    const captionText = `🔥 Especial Oportunidades - ${pub.name || "RealStock"}\n\nConfira esta seleção VIP de anúncios patrocinados da RealStock 👇\n\nGaranta a melhor negociação exclusiva acessando nosso portal online!`;

    let finalPostId = null;

    if (propertiesWithImages.length === 1) {
       const urlParams = new URLSearchParams();
       urlParams.append('url', propertiesWithImages[0].images[0].imageUrl);
       urlParams.append('message', captionText);
       urlParams.append('access_token', pageToken);

       const createMediaRes = await fetch(`${BASE_GRAPH}/${pageId}/photos`, {
           method: "POST",
           body: urlParams
       });

       const mediaData = await createMediaRes.json();
       if (!createMediaRes.ok || !mediaData.post_id) return NextResponse.json({ success: false, error: "FB Graph Api Erro: Foto única" }, { status: 500 });
       finalPostId = mediaData.post_id;
    } else {
       const attachedMedia = [];
       for (const prop of propertiesWithImages) {
           const urlParams = new URLSearchParams();
           urlParams.append('url', prop.images[0].imageUrl);
           urlParams.append('published', 'false');
           urlParams.append('access_token', pageToken);
           
           const res = await fetch(`${BASE_GRAPH}/${pageId}/photos`, {
               method: "POST",
               body: urlParams
           });
           
           const data = await res.json();
           if (!res.ok || !data.id) return NextResponse.json({ success: false, error: "Erro upload imagem galeria." }, { status: 500 });
           attachedMedia.push({ media_fbid: data.id });
       }

       const feedParams = new URLSearchParams();
       feedParams.append('message', captionText);
       feedParams.append('attached_media', JSON.stringify(attachedMedia));
       feedParams.append('access_token', pageToken);

       const createFeedRes = await fetch(`${BASE_GRAPH}/${pageId}/feed`, { 
         method: "POST",
         body: feedParams
       });
       const feedData = await createFeedRes.json();
       if (!createFeedRes.ok || !feedData.id) return NextResponse.json({ success: false, error: "Erro disparo carrossel Face." }, { status: 500 });
       finalPostId = feedData.id;
    }

    let permalink = "";
    if (finalPostId) {
       try {
           const permalinkRes = await fetch(`${BASE_GRAPH}/${finalPostId}?fields=permalink_url&access_token=${pageToken}`);
           const permalinkData = await permalinkRes.json();
           if (permalinkData.permalink_url) permalink = permalinkData.permalink_url;
       } catch(err) {}
    }

    await prisma.facebookFeedSession.create({
       data: {
         listingId: -2,
         status: "PUBLISHED",
         publishedPostId: finalPostId,
         allImageUrls: [],
         selectedImages: [],
         validationReport: { permalink, isSponsoredAdminBox: true },
         caption: pub.id,
       }
    });

    return NextResponse.json({ success: true, message: "Lote Admin publicado no Face!" });

  } catch (error: any) {
    console.error("ADMIN FB PUBLISH ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
