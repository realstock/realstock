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
      return NextResponse.json({ success: false, error: "Parâmetros inválidos ou nenhum imóvel selecionado." }, { status: 400 });
    }

    if (selectedPropertyIds.length > 10) {
      return NextResponse.json({ success: false, error: "O limite do Carrossel é de 10 fotos no máximo." }, { status: 400 });
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
          error: "Não foi possível recuperar o Page Access Token. O usuário não tem permissão para postar nesta Página."
        }, { status: 500 });
    }
    
    const pageToken = pageInfo.access_token;

    // Check if there's an old portfolio to delete (for republishing)
    const oldSession = await prisma.facebookFeedSession.findFirst({
        where: { listingId: -1, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" }
    });

    if (oldSession && oldSession.publishedPostId) {
        try {
            console.log("Deleting old fb admin portfolio: " + oldSession.publishedPostId);
            await fetch(`${BASE_GRAPH}/${oldSession.publishedPostId}?access_token=${pageToken}`, { method: 'DELETE' });
            await prisma.facebookFeedSession.update({
                where: { id: oldSession.id },
                data: { status: 'DELETED' }
            });
        } catch(e) { console.error("Could not delete old portfolio", e); }
    }

    const caption = `🌟 Portfólio VIP Selecionado!\n\nConfira os melhores imóveis parceiros e ofertas fresquinhas no carrossel abaixo 👇\n\nEntre em contato com nossa central!`;

    let finalPostId = null;

    if (propertiesWithImages.length === 1) {
       const singleUrl = propertiesWithImages[0].images[0].imageUrl;
       
       const urlParams = new URLSearchParams();
       urlParams.append('url', singleUrl);
       urlParams.append('message', caption);
       urlParams.append('access_token', pageToken);

       const createMediaRes = await fetch(`${BASE_GRAPH}/${pageId}/photos`, { 
         method: "POST",
         body: urlParams
       });
       const mediaData = await createMediaRes.json();
       if (!createMediaRes.ok || !mediaData.id) return NextResponse.json({ success: false, error: "Erro ao criar mídia FB." }, { status: 500 });
       finalPostId = mediaData.id;
    } else {
       const childrenIds: string[] = [];
       try {
           const uploadPromises = propertiesWithImages.map(async (prop) => {
               const urlParams = new URLSearchParams();
               urlParams.append('url', prop.images[0].imageUrl);
               urlParams.append('published', 'false');
               urlParams.append('access_token', pageToken);

               const res = await fetch(`${BASE_GRAPH}/${pageId}/photos`, { 
                 method: "POST",
                 body: urlParams
               });
               const data = await res.json();
               if (!res.ok || !data.id) throw new Error(data.error?.message || "Erro desconhecido ao upar item.");
               return data.id;
           });
           
           const ids = await Promise.all(uploadPromises);
           childrenIds.push(...ids);
       } catch (err: any) {
           return NextResponse.json({ success: false, error: "Erro ao upar imagens fb: " + err.message }, { status: 500 });
       }

       const carouselParams = new URLSearchParams();
       carouselParams.append('message', caption);
       childrenIds.forEach(id => {
          carouselParams.append('attached_media[]', `{"media_fbid":"${id}"}`);
       });
       carouselParams.append('access_token', pageToken);

       const carouselRes = await fetch(`${BASE_GRAPH}/${pageId}/feed`, { 
          method: "POST",
          body: carouselParams
       });
       const carouselData = await carouselRes.json();
       
       if (!carouselRes.ok || !carouselData.id) {
           return NextResponse.json({ success: false, error: "Erro ao agrupar carrossel FB." }, { status: 500 });
       }
       finalPostId = carouselData.id;
    }

    const permalinkRaw = await fetch(`${BASE_GRAPH}/${finalPostId}?fields=permalink_url&access_token=${pageToken}`);
    const permalinkData = await permalinkRaw.json();

    await prisma.facebookFeedSession.create({
       data: {
          listingId: -1,
          caption: caption,
          status: "PUBLISHED",
          allImageUrls: propertiesWithImages.map(p => p.images[0].imageUrl),
          selectedImages: propertiesWithImages.map(p => p.images[0].imageUrl),
          publishedPostId: finalPostId,
          validationReport: {
             permalink: permalinkData.permalink_url || `https://facebook.com/${finalPostId}`,
             success: true
          }
       }
    });

    return NextResponse.json({ success: true, message: "Portfólio Impulsionado no Facebook com sucesso!" });
  } catch (error: any) {
    console.error("CAPTURE ADMIN FB PORTFOLIO ERROR:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}
