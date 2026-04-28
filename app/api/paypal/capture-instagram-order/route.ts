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
                        description: `Publicação de Imóvel #${propertyId} (Instagram)`,
                        referenceId: orderID,
                        userId: user.id,
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (Post Insta)`,
                        referenceId: orderID,
                        userId: user.id,
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR:", finErr);
    }

    // Payment is completed! Now let's fetch the property and post to Instagram
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

    const igUserId = process.env.INSTAGRAM_IG_USER_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!igUserId || !igToken) {
      return NextResponse.json({
        success: false,
        error: "As credenciais do Instagram não estão configuradas (INSTAGRAM_IG_USER_ID ou INSTAGRAM_ACCESS_TOKEN). Pagamento aprovado, porém postagem falhou."
      }, { status: 500 });
    }

    // Publish to Instagram Graph API
    const imagesToPost = property.images?.slice(0, 10) || [];
    if (imagesToPost.length === 0) {
        return NextResponse.json({
          success: false,
          error: "O anúncio precisa ter no mínimo 1 foto para publicar no Instagram. Pagamento aprovado, porém postagem falhou."
        }, { status: 400 });
    }

    const caption = `🏡 Novo imóvel disponível!\n\n${property.title}\n📍 ${property.city} - ${property.state}\n💰 R$ ${Number(property.price).toLocaleString("pt-BR")}\n\n${property.description || ""}\n\nAcesse nosso site para mais detalhes!`;

    let finalMediaId = null;

    if (postType === "reels" && property.reelsVideoUrl) {
       // Publicar como REELS
       const createReelRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?media_type=REELS&video_url=${encodeURIComponent(property.reelsVideoUrl)}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, {
           method: "POST"
       });
       const reelData = await createReelRes.json();
       if (!createReelRes.ok || !reelData.id) {
           console.error("IG CREATE REEL ERROR", reelData);
           return NextResponse.json({
             success: false,
             error: "Erro ao criar container do Reels. Verifique se o vídeo possui formato compatível. Detalhes: " + (reelData.error?.message || "Desconhecido")
           }, { status: 500 });
       }
       finalMediaId = reelData.id;
    } else if (imagesToPost.length === 1) {
       // Apenas 1 foto, post simples
       const singleUrl = imagesToPost[0].imageUrl;
       const createMediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(singleUrl)}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, {
           method: "POST",
       });

       const mediaData = await createMediaRes.json();
       
       if (!createMediaRes.ok || !mediaData.id) {
          console.error("IG CREATE MEDIA ERROR", mediaData);
          return NextResponse.json({
            success: false,
            error: "Erro ao criar container no Instagram. Mensagem: " + (mediaData.error?.message || "Desconhecido")
          }, { status: 500 });
       }
       finalMediaId = mediaData.id;
    } else {
       // Mais de 1 foto, criar Carrossel
       const childrenIds = [];
       for (const img of imagesToPost) {
           const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(img.imageUrl)}&is_carousel_item=true&access_token=${igToken}`, {
               method: "POST"
           });
           const data = await res.json();
           if (!res.ok || !data.id) {
               console.error("IG CREATE CAROUSEL ITEM ERROR", data);
               return NextResponse.json({
                 success: false,
                 error: "Erro ao upar foto do carrossel. Mensagem: " + (data.error?.message || "Desconhecido")
               }, { status: 500 });
           }
           childrenIds.push(data.id);
       }

       // Criar container do carrossel integrando os IDs dos filhos
       const createCarouselRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?media_type=CAROUSEL&children=${childrenIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, { 
         method: "POST" 
       });
       const carouselData = await createCarouselRes.json();
       if (!createCarouselRes.ok || !carouselData.id) {
           console.error("IG CREATE CAROUSEL ERROR", carouselData);
           return NextResponse.json({
             success: false,
             error: "Erro ao criar carrossel. Mensagem: " + (carouselData.error?.message || "Desconhecido")
           }, { status: 500 });
       }
       finalMediaId = carouselData.id;
    }

    // Wait for Instagram backend to deeply process the Media Container before attempting to publish
    let isReady = false;
    for (let attempt = 0; attempt < 6; attempt++) {
        // Sleep for 3 seconds between polls
        await new Promise(r => setTimeout(r, 3000));
        
        const statusRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}?fields=status_code&access_token=${igToken}`);
        const statusData = await statusRes.json();
        
        if (statusData.status_code === "FINISHED") {
            isReady = true;
            break;
        } else if (statusData.status_code === "ERROR") {
             console.error("IG MEDIA PROCESSING ERROR", statusData);
             break;
        }
    }

    if (!isReady) {
         console.warn("IG MEDIA TIMEOUT. Will attempt to publish anyway.");
    }

    // Publish Media
    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${finalMediaId}&access_token=${igToken}`, {
        method: "POST",
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
       console.error("IG PUBLISH ERROR", publishData);
       return NextResponse.json({
         success: false,
         error: "Erro ao publicar no Instagram. Mensagem: " + (publishData.error?.message || "Desconhecido")
       }, { status: 500 });
    }

    // Get the permalink
    let permalink = "";
    try {
        const permalinkRes = await fetch(`https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${igToken}`);
        const permalinkData = await permalinkRes.json();
        if (permalinkData.permalink) {
             permalink = permalinkData.permalink;
        }
    } catch(err) {
        console.error("Error fetching permalink", err);
    }

    // Save the record to database so we know it was published
    await prisma.instagramPreviewSession.create({
       data: {
         listingId: property.id,
         status: "PUBLISHED",
         publishedMediaId: publishData.id,
         allImageUrls: [],
         selectedImages: [],
         validationReport: { permalink },
         caption: caption,
       }
    });

    // VINCULAR DIRETAMENTE NO IMÓVEL
    await prisma.property.update({
       where: { id: property.id },
       data: {
           instagramMediaId: publishData.id,
           instagramPermalink: permalink
       }
    });

    // Everything went well!
    return NextResponse.json({
      success: true,
      message: "Pagamento aprovado e anúncio publicado no Instagram com sucesso!",
      instagram_media_id: publishData.id
    });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE IG ORDER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno ao processar a captura ou postagem.",
      },
      { status: 500 }
    );
  }
}
