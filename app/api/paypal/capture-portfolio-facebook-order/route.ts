import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    if (!orderID || !Array.isArray(selectedPropertyIds) || selectedPropertyIds.length === 0) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos ou nenhum imóvel selecionado." }, { status: 400 });
    }

    if (selectedPropertyIds.length > 10) {
      return NextResponse.json({ success: false, error: "O limite do Facebook é de 10 fotos por carrossel." }, { status: 400 });
    }

    // Capture payment
    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;
    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    });

    const captureData = await captureRes.json();
    if (captureData.status !== "COMPLETED") {
      return NextResponse.json({ success: false, error: "Pagamento não concluído." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });

    const properties = await prisma.property.findMany({
      where: { 
         ownerId: user.id,
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
        where: { listingId: 0, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" }
    });

    if (oldSession && oldSession.publishedPostId) {
        try {
            console.log("Deleting old fb portfolio: " + oldSession.publishedPostId);
            await fetch(`${BASE_GRAPH}/${oldSession.publishedPostId}?access_token=${pageToken}`, { method: 'DELETE' });
            await prisma.facebookFeedSession.update({
                where: { id: oldSession.id },
                data: { status: 'DELETED' }
            });
        } catch(e) { console.error("Could not delete old portfolio", e); }
    }

    const caption = `🌟 Conheça nosso Portfólio de Imóveis!\n\nConfira as novidades e melhores oportunidades da RealStock nas fotos abaixos 👇\n\nEntre em contato ou acesse nosso site para mais detalhes de cada imóvel!`;

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
       
       if (!createMediaRes.ok || !mediaData.post_id) {
          console.error("FB CREATE MEDIA ERROR", mediaData);
          return NextResponse.json({ success: false, error: "Erro ao criar foto no Facebook Page." }, { status: 500 });
       }
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
           if (!res.ok || !data.id) {
               console.error("FB CREATE PHOTO ITEM ERROR", data);
               return NextResponse.json({ success: false, error: "Erro ao upar foto da galeria." }, { status: 500 });
           }
           attachedMedia.push({ media_fbid: data.id });
       }

       const feedParams = new URLSearchParams();
       feedParams.append('message', caption);
       feedParams.append('attached_media', JSON.stringify(attachedMedia));
       feedParams.append('access_token', pageToken);

       const createFeedRes = await fetch(`${BASE_GRAPH}/${pageId}/feed`, { 
         method: "POST",
         body: feedParams
       });
       const feedData = await createFeedRes.json();
       
       if (!createFeedRes.ok || !feedData.id) {
           console.error("FB CREATE FEED ERROR", feedData);
           return NextResponse.json({ success: false, error: "Erro ao criar post em galeria no Facebook." }, { status: 500 });
       }
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
         listingId: 0, // 0 = PORTFOLIO
         status: "PUBLISHED",
         publishedPostId: finalPostId,
         allImageUrls: [],
         selectedImages: [],
         validationReport: { permalink, isPortfolio: true },
         caption: caption,
       }
    });

    return NextResponse.json({ success: true, message: "Portfólio publicado no Facebook!" });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE PORTFOLIO FB ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
