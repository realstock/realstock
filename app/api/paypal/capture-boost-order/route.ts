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
    } else if (platform === "meta") {
        // Tenta achar primeiro Instagram, depois Facebook. Se nenhum existir, sourceId continua null e cai na lógica de Dark Post.
        const igSession = await prisma.instagramPreviewSession.findFirst({
            where: { listingId: Number(propertyId), status: "PUBLISHED" },
            orderBy: { createdAt: "desc" }
        });
        if (igSession && igSession.publishedMediaId) {
            sourceId = igSession.publishedMediaId;
            // Se achou IG, mudamos a plataforma interna para instagram para usar o creative correto, 
            // mas o targeting (definido na linha 152) continuará sendo [facebook, instagram] se platform original era meta.
        } else {
            const fbSession = await prisma.facebookFeedSession.findFirst({
                where: { listingId: Number(propertyId), status: "PUBLISHED" },
                orderBy: { createdAt: "desc" }
            });
            if (fbSession && fbSession.publishedPostId) {
                sourceId = fbSession.publishedPostId;
            }
        }
        
        if (!sourceId) {
            sourceId = `Prop_${propertyId}`; 
        }
    } else {
        sourceId = `Prop_${propertyId}`;
    }

    const rawAdAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const adAccountId = rawAdAccountId && !rawAdAccountId.startsWith('act_') ? `act_${rawAdAccountId}` : rawAdAccountId;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN; 
    const igUserId = process.env.INSTAGRAM_IG_USER_ID;

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
    campaignForm.append("objective", "OUTCOME_AWARENESS"); // Mais estável para impulsionamento via API
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
    adSetForm.append("optimization_goal", "REACH");
    adSetForm.append("promoted_object", JSON.stringify({ page_id: pageId }));
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

    const buildCreative = async (actor: string, storySpec: boolean = false, useUserIdKey: boolean = false) => {
        const form = new URLSearchParams();
        form.append("name", `Criativo Boost Prop ${propertyId}`);
        const actorKey = useUserIdKey ? "instagram_user_id" : "instagram_actor_id";
        
        if (storySpec) {
          form.append("object_story_spec", JSON.stringify({
              [actorKey]: actor,
              source_instagram_media_id: sourceId
          }));
        } else {
          form.append(actorKey, actor);
          form.append("source_instagram_media_id", sourceId);
        }
        form.append("access_token", igToken);
        const res = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: form });
        return res.json();
    };

    let creativeData: any = null;

    if (platform === "instagram" && sourceId && !sourceId.startsWith("Prop_")) {
        // Resgatar igActorId
        let igActorId = igUserId;
        if (!igActorId) {
            try {
                const pageRes = await fetch(`${BASE_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
                const pageData = await pageRes.json();
                igActorId = pageData.instagram_business_account?.id;
            } catch (e) {}
        }

        if (igActorId) {
            // Tenta o leque de possibilidades
            creativeData = await buildCreative(igActorId, false, true); // Tentativa 1: instagram_user_id

            if (creativeData.error && (creativeData.error.code === 100 || creativeData.error.code === 1)) {
                creativeData = await buildCreative(igActorId, true, false); // Fallback 1: story_spec
            }
            if (creativeData.error && (creativeData.error.code === 100 || creativeData.error.code === 1)) {
                creativeData = await buildCreative(pageId, true, false); // Fallback 2: Page ID como Ator
            }
        } else {
             throw new Error("ID do Instagram não encontrado. Vincule sua conta Instagram à Página.");
        }
    } else if (platform === "facebook" && sourceId && !sourceId.startsWith("Prop_")) {
        const facebookForm = new URLSearchParams();
        facebookForm.append("name", `Criativo Boost Prop ${propertyId}`);
        facebookForm.append("object_story_id", sourceId);
        facebookForm.append("access_token", igToken);
        const fbRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: facebookForm });
        creativeData = await fbRes.json();
    }

    if (!creativeData || !creativeData.id) {
        console.error("ERRO CRIATIVO FB", creativeData);
        return NextResponse.json({ success: false, error: "Falha ao vincular o post: " + (creativeData.error?.message||"Desconhecido") }, { status: 500 });
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
            data: { 
                portfolioBoostedUntil: endTime, 
                metaPortfolioBoostedUntil: endTime,
                metaPortfolioAdId: adData.id, // User model might need fields too if they boost portfolio
                metaPortfolioCampaignId: campaignId
            }
        });
    } else {
        await prisma.property.update({
            where: { id: Number(propertyId) },
            data: { 
                boostedUntil: endTime, 
                metaBoostedUntil: endTime,
                metaAdId: adData.id,
                metaCampaignId: campaignId
            }
        });
    }

    return NextResponse.json({ success: true, message: "🚀 Anúncio criado e turbinado com sucesso pela Marketing API!" });

  } catch (error: any) {
    console.error("PAYPAL CAPTURE BOOST ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno: " + error.message }, { status: 500 });
  }
}
