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

    // Fetch user for financial record
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });

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
                        description: `Publicação de Imóvel #${propertyId} (Facebook)`,
                        referenceId: orderID,
                        userId: user?.id
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (Post Face)`,
                        referenceId: orderID,
                        userId: user?.id
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR:", finErr);
    }

    // Fetch the property
    const property = await prisma.property.findUnique({
      where: { id: Number(propertyId) },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        owner: true
      }
    });

    if (!property) {
       return NextResponse.json({ success: false, error: "Anúncio não encontrado após pagamento." }, { status: 404 });
    }

    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;

    if (!pageId || !igToken) {
      return NextResponse.json({
        success: false,
        error: "As credenciais do Facebook não estão configuradas (FACEBOOK_PAGE_ID ou INSTAGRAM_ACCESS_TOKEN). Pagamento aprovado, porém postagem falhou."
      }, { status: 500 });
    }

    const BASE_GRAPH = "https://graph.facebook.com/v19.0";

    // Extrair o Page Access Token
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

    // Publish to Facebook Graph API
    const imagesToPost = property.images?.slice(0, 10) || [];
    if (imagesToPost.length === 0 && postType === "carousel") {
        return NextResponse.json({
          success: false,
          error: "O anúncio precisa ter no mínimo 1 foto para publicar no Facebook. Pagamento aprovado, porém postagem falhou."
        }, { status: 400 });
    }

    const caption = `🏡 Novo imóvel disponível!\n\n${property.title}\n📍 ${property.city} - ${property.state}\n💰 R$ ${Number(property.price).toLocaleString("pt-BR")}\n\n${property.description || ""}\n\nAcesse nosso site para mais detalhes!`;

    let finalPostId = null;

    if (postType === "reels" && property.reelsVideoUrl) {
       // Publicar como VÍDEO (Reels no Facebook Page)
       const videoParams = new URLSearchParams();
       videoParams.append('file_url', property.reelsVideoUrl);
       videoParams.append('description', caption);
       videoParams.append('access_token', pageToken);

       const createVideoRes = await fetch(`${BASE_GRAPH}/${pageId}/videos`, {
           method: "POST",
           body: videoParams
       });
       const videoData = await createVideoRes.json();
       if (!createVideoRes.ok || !videoData.id) {
           console.error("FB CREATE VIDEO ERROR", videoData);
           return NextResponse.json({
             success: false,
             error: "Erro ao postar vídeo no Facebook. Mensagem: " + (videoData.error?.message || "Desconhecido")
           }, { status: 500 });
       }
       finalPostId = videoData.id;
    } else if (imagesToPost.length === 1) {
       // Apenas 1 foto, post simples
       const singleUrl = imagesToPost[0].imageUrl;
       
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
          return NextResponse.json({
            success: false,
            error: "Erro ao criar foto no Facebook Page. Mensagem: " + (mediaData.error?.message || "Desconhecido")
          }, { status: 500 });
       }
       finalPostId = mediaData.post_id;
    } else {
       // Mais de 1 foto, criar feed post com attached_media
       const attachedMedia = [];
       for (const img of imagesToPost) {
           const urlParams = new URLSearchParams();
           urlParams.append('url', img.imageUrl);
           urlParams.append('published', 'false');
           urlParams.append('access_token', pageToken);
           
           const res = await fetch(`${BASE_GRAPH}/${pageId}/photos`, {
               method: "POST",
               body: urlParams
           });
           
           const data = await res.json();
           if (!res.ok || !data.id) {
               console.error("FB CREATE PHOTO ITEM ERROR", data);
               return NextResponse.json({
                 success: false,
                 error: "Erro ao upar foto da galeria. Mensagem: " + (data.error?.message || "Desconhecido")
               }, { status: 500 });
           }
           attachedMedia.push({ media_fbid: data.id });
       }

       // Criar post agregando as medias
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
           return NextResponse.json({
             success: false,
             error: "Erro ao criar post em galeria no Facebook. Mensagem: " + (feedData.error?.message || "Desconhecido")
           }, { status: 500 });
       }
       finalPostId = feedData.id;
    }

    let permalink = "";
    if (finalPostId) {
       try {
           const permalinkRes = await fetch(`${BASE_GRAPH}/${finalPostId}?fields=permalink_url&access_token=${pageToken}`);
           const permalinkData = await permalinkRes.json();
           if (permalinkData.permalink_url) {
                permalink = permalinkData.permalink_url;
           }
       } catch(err) {
           console.error("Error fetching fb permalink", err);
       }
    }

    // Save the record to database so we know it was published
    await prisma.facebookFeedSession.create({
       data: {
         listingId: property.id,
         postType: postType,
         status: "PUBLISHED",
         publishedPostId: finalPostId,
         allImageUrls: [],
         selectedImages: [],
         validationReport: { permalink },
         caption: caption,
       }
    });

    // Everything went well!
    return NextResponse.json({
      success: true,
      message: "Pagamento aprovado e anúncio publicado no Facebook com sucesso!",
      facebook_post_id: finalPostId
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE FB ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno ao processar a captura ou postagem.",
      },
      { status: 500 }
    );
  }
}
