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
  if (!res.ok) throw new Error(data.error_description || "Falha PayPal Auth");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { orderID, propertyId, dailyBudget, platform } = await req.json();

    if (!orderID || !propertyId || !dailyBudget) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
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
                        category: "ADS_BOOST",
                        amount: grossAmount,
                        description: `Impulsionamento Meta Ads (Imóvel #${propertyId})`,
                        referenceId: orderID,
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (Boost Meta)`,
                        referenceId: orderID,
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR:", finErr);
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });

    let property: any = null;
    if (Number(propertyId) !== 0) {
      property = await prisma.property.findFirst({
          where: { id: Number(propertyId), ownerId: user.id }
      });
      if (!property) return NextResponse.json({ success: false, error: "Anúncio inválido." }, { status: 404 });
    } else {
      property = { id: 0, state: user.state || "Brasil" }; // Pseudo-property for target
    }

    let sourceId = null;

    if (platform === "instagram") {
        const igSession = await prisma.instagramPreviewSession.findFirst({
            where: { listingId: Number(propertyId), status: "PUBLISHED" },
            orderBy: { createdAt: "desc" }
        });
        if (!igSession || !igSession.publishedMediaId) {
            return NextResponse.json({ success: false, error: "Mídia do Instagram não encontrada para impulsionar." }, { status: 404 });
        }
        sourceId = igSession.publishedMediaId;
    } else if (platform === "facebook") {
        const fbSession = await prisma.facebookFeedSession.findFirst({
            where: { listingId: Number(propertyId), status: "PUBLISHED" },
            orderBy: { createdAt: "desc" }
        });
        if (!fbSession || !fbSession.publishedPostId) {
            return NextResponse.json({ success: false, error: "Publicação no Facebook não encontrada para impulsionar." }, { status: 404 });
        }
        sourceId = fbSession.publishedPostId;
    } else {
        // "meta" unfied platform
        sourceId = `Prop_${propertyId}`; // Dummy reference ID since we generate dark post from DB images
    }

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN; 

    if (!adAccountId || !pageId || !igToken) {
       console.warn("Pagamento aprovado, porém FB Marketing API não configurada totalmente (.env). Cancelando pipeline Ads.");
       const dummyEndTime = new Date();
       dummyEndTime.setDate(dummyEndTime.getDate() + 5);
       if (Number(propertyId) === 0) {
           await prisma.user.update({
               where: { id: user.id },
               data: { portfolioBoostedUntil: dummyEndTime }
           });
       } else {
           await prisma.property.update({
               where: { id: Number(propertyId) },
               data: { boostedUntil: dummyEndTime }
           });
       }
       return NextResponse.json({ success: true, warning: "Pagamento aprovado. Meta Ads não subiu por falta de variáveis no painel .env" });
    }

    const BASE_GRAPH = "https://graph.facebook.com/v19.0";
    
    // 1. OBTÉM REGIÃO PARA TARGET
    let regionKey = null;
    const stateName = property.state || "Brasil";
    try {
        const geoRes = await fetch(`${BASE_GRAPH}/search?type=adgeolocation&q=${encodeURIComponent(stateName)}&country_code=BR&location_types=["region"]&access_token=${igToken}`);
        const geoData = await geoRes.json();
        if (geoData.data && geoData.data.length > 0) {
             regionKey = geoData.data[0].key;
        }
    } catch(e) { console.error("FB GEO ERROR", e); }

    const targeting = regionKey ? {
       geo_locations: { regions: [{ key: regionKey }] },
       publisher_platforms: platform === "meta" ? ["facebook", "instagram"] : [platform === "instagram" ? "instagram" : "facebook"],
       ...(platform === "instagram" ? { instagram_positions: ["stream", "story"] } : platform === "facebook" ? { facebook_positions: ["feed"] } : { instagram_positions: ["stream", "story"], facebook_positions: ["feed"] })
    } : {
       geo_locations: { countries: ["BR"] },
       publisher_platforms: platform === "meta" ? ["facebook", "instagram"] : [platform === "instagram" ? "instagram" : "facebook"]
    };

    // 2. CRIA CAMPANHA
    const campaignForm = new URLSearchParams();
    campaignForm.append("name", `RealStock Boost Propriedade ${property.id}`);
    campaignForm.append("objective", "OUTCOME_TRAFFIC");
    campaignForm.append("status", "ACTIVE");
    campaignForm.append("special_ad_categories", '["HOUSING"]'); // Requisito do FB para imóveis
    campaignForm.append("special_ad_category_country", '["BR"]'); // Requisito do FB para Categoria Especial
    campaignForm.append("is_adset_budget_sharing_enabled", "false"); // Evita erro de compartilhamento de orçamento em AdSets
    campaignForm.append("access_token", igToken);

    const campRes = await fetch(`${BASE_GRAPH}/${adAccountId}/campaigns`, { method: "POST", body: campaignForm });
    const campData = await campRes.json();
    if (!campData.id) {
        console.error("ERRO CAMPANHA FB", campData);
        return NextResponse.json({ success: false, error: "Falha ao criar Campanha Meta Ads: " + (campData.error?.message||"") }, { status: 500 });
    }
    const campaignId = campData.id;

    // 3. CRIA ADSET (Orçamento e Duração 5 dias)
    const dailyBudgetCents = Math.floor(Number(dailyBudget) * 100);
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 5);

    const adSetForm = new URLSearchParams();
    adSetForm.append("name", `AdSet RealStock ${property.state}`);
    adSetForm.append("campaign_id", campaignId);
    adSetForm.append("daily_budget", dailyBudgetCents.toString());
    adSetForm.append("billing_event", "IMPRESSIONS");
    adSetForm.append("optimization_goal", "LINK_CLICKS");
    adSetForm.append("bid_strategy", "LOWEST_COST_WITHOUT_CAP"); // Facebook exige declaração do algoritmo de lances
    adSetForm.append("targeting", JSON.stringify(targeting));
    adSetForm.append("end_time", endTime.toISOString());
    adSetForm.append("status", "ACTIVE");
    adSetForm.append("access_token", igToken);

    const adSetRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adsets`, { method: "POST", body: adSetForm });
    const adSetData = await adSetRes.json();
    if (!adSetData.id) {
        console.error("ERRO ADSET FB", adSetData);
        return NextResponse.json({ success: false, error: "Falha ao criar Conjunto de Anúncios: " + (adSetData.error?.message||"") }, { status: 500 });
    }
    const adSetId = adSetData.id;

    // 4. CRIA CRIATIVO USANDO MÍDIA ORGÂNICA DO IG
    let processAppUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://www.realstock.com.br";
    if (processAppUrl.includes("localhost")) {
         processAppUrl = "https://www.realstock.com.br"; // FB não aceita localhost como destino de anúncio real
    }
    const propertyLink = Number(propertyId) === 0 ? processAppUrl : `${processAppUrl}/imovel/${property.id}`;

    const creativeForm = new URLSearchParams();
    creativeForm.append("name", `Criativo Ad Firebase ${sourceId}`);

    /* ==============================================================
       NOVA LÓGICA: IMPULSIONAMENTO 100% NATIVO OU DARK POST
       ============================================================== */
    
    let isOrganicBoost = false;

    if (platform === "instagram" && sourceId && !sourceId.startsWith("Prop_")) {
        // Resgatar obrigatoriamente o instagram_actor_id da página
        let igActorId = "";
        try {
            const pageRes = await fetch(`${BASE_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
            const pageData = await pageRes.json();
            if (pageData.instagram_business_account?.id) {
                igActorId = pageData.instagram_business_account.id;
            }
        } catch (e) {
            console.error("Falha ao puxar instagram_business_account", e);
        }

        if (igActorId) {
            creativeForm.append("object_story_spec", JSON.stringify({
                 page_id: pageId,
                 instagram_actor_id: igActorId,
                 source_instagram_media_id: sourceId
            }));
            isOrganicBoost = true;
        } else {
             // Fallback se não achar conta IG
             creativeForm.append("object_story_spec", JSON.stringify({
                 page_id: pageId
             }));
             creativeForm.append("source_instagram_media_id", sourceId);
             isOrganicBoost = true;
        }
    } else if (platform === "facebook" && sourceId && !sourceId.startsWith("Prop_")) {
        creativeForm.append("object_story_id", sourceId);
        isOrganicBoost = true;
    }

    if (!isOrganicBoost) {
        // Ler a primeira foto diretamente do DB (Muito mais confiável e rápido que o CDN do instagram)
        let imageUrl = null;
        if (Number(propertyId) !== 0) {
            const propWithImgs = await prisma.property.findUnique({
                 where: { id: Number(propertyId) },
                 include: { images: true }
            });
            if (propWithImgs?.images?.length) {
                 imageUrl = propWithImgs.images[0].imageUrl;
            }
        } else {
            // Portfólio, puxa o primeiro imóvel do user
            const firstProp = await prisma.property.findFirst({
                 where: { ownerId: user.id },
                 include: { images: true },
                 orderBy: { createdAt: 'desc' }
            });
            if (firstProp?.images?.length) {
                 imageUrl = firstProp.images[0].imageUrl;
            }
        }

        if (!imageUrl) {
            return NextResponse.json({ success: false, error: `Falha ao localizar imagem no banco de dados para criar o anúncio.` }, { status: 500 });
        }

        // Download da imagem para gerar o Buffer do Meta Ads Library
        let imgBuffer: ArrayBuffer | null = null;
        try {
            const imgRes = await fetch(imageUrl);
            imgBuffer = await imgRes.arrayBuffer();
        } catch (e) { console.error("Falha ao baixar imagem do Storage", e); }

        if (!imgBuffer || imgBuffer.byteLength < 100) {
            return NextResponse.json({ success: false, error: `Falha ao ler bytes da imagem original.` }, { status: 500 });
        }

        // Converter para Base64 para evitar bug de Blob Boundary no node/nextjs
        const base64Str = Buffer.from(imgBuffer).toString('base64');

        // Upload imagem na biblioteca de Ad 
        const imageUploadForm = new URLSearchParams();
        imageUploadForm.append("bytes", base64Str);
        imageUploadForm.append("access_token", igToken);
        
        const imageRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adimages`, { method: "POST", body: imageUploadForm });
        const imageData = await imageRes.json();

        let imageHash = "";
        if (imageData.images && Object.keys(imageData.images).length > 0) {
            imageHash = imageData.images[Object.keys(imageData.images)[0]].hash;
        } else {
            return NextResponse.json({ success: false, error: "Falha ao gerar Ad Image. Mídia indisponível." }, { status: 500 });
        }

        creativeForm.append("object_story_spec", JSON.stringify({
            page_id: pageId,
            link_data: {
                 image_hash: imageHash,
                 link: propertyLink,
                 message: "Confira esta excelente oportunidade que acabou de entrar!"
            }
        }));
    }

    creativeForm.append("access_token", igToken);

    const creativeRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: creativeForm });
    const creativeData = await creativeRes.json();
    if (!creativeData.id) {
        console.error("ERRO CRIATIVO FB", creativeData);
        return NextResponse.json({ success: false, error: "Falha ao vincular o post do Insta: " + (creativeData.error?.message||"") }, { status: 500 });
    }
    const creativeId = creativeData.id;

    // 5. CRIA O ANÚNCIO FINAL
    const adForm = new URLSearchParams();
    adForm.append("name", `Anuncio Turbinado Prop ${property.id}`);
    adForm.append("adset_id", adSetId);
    adForm.append("creative", JSON.stringify({ creative_id: creativeId }));
    adForm.append("status", "ACTIVE");
    adForm.append("access_token", igToken);

    const adRes = await fetch(`${BASE_GRAPH}/${adAccountId}/ads`, { method: "POST", body: adForm });
    const adData = await adRes.json();
    if (!adData.id) {
        console.error("ERRO FINAL ANUNCIO FB", adData);
        return NextResponse.json({ success: false, error: "Anúncio recusado: " + (adData.error?.message||"") }, { status: 500 });
    }

    await prisma.metaAdsSession.create({
        data: {
             listingId: Number(propertyId),
             campaignId: campaignId,
             status: "IN_PROCESS",
             budget: Number(dailyBudget) * 5,
             budgetDays: 5,
             platform: "meta"
        }
    });

    if (Number(propertyId) === 0) {
        await prisma.user.update({
            where: { id: user.id },
            data: { portfolioBoostedUntil: endTime, metaPortfolioBoostedUntil: endTime }
        });
    } else {
        await prisma.property.update({
            where: { id: Number(propertyId) },
            data: { boostedUntil: endTime, metaBoostedUntil: endTime }
        });
    }

    return NextResponse.json({ success: true, message: "🚀 Anúncio criado e turbinado com sucesso pela Marketing API!" });

  } catch (error: any) {
    console.error("PAYPAL CAPTURE BOOST ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno: " + error.message }, { status: 500 });
  }
}
