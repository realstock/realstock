import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRealStockGoogleCampaign } from "@/lib/googleAds";

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

    const body = await req.json();
    const { orderID, propertyId, dailyBudget, platform, postType, targetLatitude, targetLongitude, targetRadiusKm } = body;
    const durationDays = Number(body.durationDays || body.duration_days || 5);

    if (!orderID || propertyId === undefined || propertyId === null || propertyId === "" || isNaN(Number(propertyId)) || !dailyBudget) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
        return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });
    }

    // Capture payment or handle special orders
    let isFree = false;

    // Calcular o custo total esperado (Investimento + Taxa de Serviço)
    const totalInvestment = Number(dailyBudget) * durationDays;
    
    const service = await prisma.siteService.findUnique({
      where: { slug: "turbinar" },
      include: { fee: true }
    });

    let feeAmount = 0;
    if (service?.fee) {
       if (service.fee.type === "PERCENTAGE") {
           feeAmount = (totalInvestment * Number(service.fee.value)) / 100;
       } else {
           feeAmount = Number(service.fee.value);
       }
    }
    const totalCharge = totalInvestment + feeAmount;

    if (orderID === "ADMIN_FREE") {
      if (user.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Acesso restrito." }, { status: 403 });
      }
      isFree = true;
    } else if (orderID === "CREDIT") {
      // turbinarCredits agora é Decimal (R$)
      if (Number(user.turbinarCredits) < totalCharge) {
        return NextResponse.json({ success: false, error: `Saldo insuficiente. Total necessário: R$ ${totalCharge.toFixed(2)}` }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { turbinarCredits: { decrement: totalCharge } }
      });

      // Logar transação de uso de crédito
      await prisma.financialTransaction.create({
        data: {
          type: "REVENUE",
          category: "ADS_BOOST",
          amount: totalCharge,
          description: `Impulsionamento ${platform} (Pago via Saldo de Créditos)`,
          referenceId: `CREDIT_${Date.now()}`,
          userId: user.id
        }
      });

      isFree = true;
    } else {
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
                          description: platform === "google" ? "Impulsionamento Google Ads" : `Impulsionamento Meta Ads (${platform})`,
                          referenceId: captureInfo.id,
                          userId: user.id
                      },
                      {
                          type: "EXPENSE",
                          category: "PAYPAL_FEE",
                          amount: feeAmount,
                          description: `Tarifa PayPal (Boost ${platform})`,
                          referenceId: captureInfo.id,
                          userId: user.id
                      }
                  ]
              });
          }
      } catch (finErr) {
          console.error("FINANCE LOGGING ERROR:", finErr);
      }
    }

    let property: any = null;
    if (Number(propertyId) !== 0) {
      property = await prisma.property.findFirst({
          where: { id: Number(propertyId), ownerId: user.id }
      });
      if (!property) return NextResponse.json({ success: false, error: "Anúncio inválido." }, { status: 404 });
    } else {
      property = { id: 0, state: user.state || "Brasil", title: "Portfólio de Imóveis Exclusivo" }; // Pseudo-property for target
    }

    if (platform === "google") {
        // Resolve Target URL
        let processAppUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://www.realstock.com.br";
        if (processAppUrl.includes("localhost") || processAppUrl.includes("192.168") || processAppUrl.includes("127.0.0.1")) {
            processAppUrl = "https://www.realstock.com.br";
        }
        const propertyLink = Number(propertyId) === 0 ? processAppUrl : `${processAppUrl}/imovel/${property.id}`;
        
        // Crate Google Campaign
        const googleRes = await createRealStockGoogleCampaign(
            Number(propertyId),
            property.title,
            Number(dailyBudget),
            propertyLink,
            durationDays,
            property?.city || undefined,
            property?.state || undefined,
            property?.category || undefined,
            property?.propertyType || undefined
        );

        const endTime = new Date();
        endTime.setDate(endTime.getDate() + durationDays);

        if (!googleRes.success) {
            console.error("ERRO FINAL ANUNCIO GOOGLE", googleRes.error);
            // Pagamento foi efetuado, salva o tempo mesmo assim para não penalizar usuário (e tentar retentativa ou só fallback orgânico local)
            if (Number(propertyId) === 0) {
                await prisma.user.update({ where: { id: user.id }, data: { googlePortfolioBoostedUntil: endTime } });
            } else {
                await prisma.property.update({ where: { id: Number(propertyId) }, data: { googleBoostedUntil: endTime } });
            }
            return NextResponse.json({ success: true, warning: "Pagamento aprovado, mas falha ao criar campanha Google Ads: " + googleRes.error });
        }

        await prisma.googleAdsSession.create({
            data: {
                listingId: Number(propertyId),
                campaignId: googleRes.campaignId,
                adGroupId: googleRes.adGroupId,
                status: "ACTIVE",
                budget: Number(dailyBudget) * durationDays,
                budgetDays: durationDays,
                targetUrl: propertyLink
            }
        });

        if (Number(propertyId) === 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: { googlePortfolioBoostedUntil: endTime }
            });
        } else {
            await prisma.property.update({
                where: { id: Number(propertyId) },
                data: { googleBoostedUntil: endTime }
            });
        }

        return NextResponse.json({ success: true, message: "🚀 Anúncio turbinado com sucesso na rede Google Ads!" });
    }

    // Turbinamento de Portfólio Geral (ID 0)
    if (Number(propertyId) === 0) {
        const endTime = new Date();
        endTime.setDate(endTime.getDate() + durationDays);
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                portfolioBoostedUntil: endTime,
                metaPortfolioBoostedUntil: endTime
            }
        });
        return NextResponse.json({ 
            success: true, 
            message: "🚀 Portfólio turbinado com sucesso! Seus imóveis receberão destaque prioritário nas buscas e na vitrine do RealStock." 
        });
    }

    let sourceId: string | null = null;

    if (platform === "instagram") {
        // Prioridade 1: Buscar sessão do postType escolhido (carrossel vs reels)
        const igSession = await prisma.instagramPreviewSession.findFirst({
            where: { listingId: Number(propertyId), status: "PUBLISHED", postType: postType || "carousel" },
            orderBy: { createdAt: "desc" }
        });
        sourceId = igSession?.publishedMediaId || property.instagramMediaId || null;

        // Fallback: Qualquer sessão do Instagram publicada
        if (!sourceId) {
            const anyIgSession = await prisma.instagramPreviewSession.findFirst({
                where: { listingId: Number(propertyId), status: "PUBLISHED" },
                orderBy: { createdAt: "desc" }
            });
            sourceId = anyIgSession?.publishedMediaId || null;
        }
        
        if (!sourceId) {
            return NextResponse.json({ success: false, error: "Mídia do Instagram não encontrada para impulsionar." }, { status: 404 });
        }
    } else if (platform === "facebook") {
        const fbSession = await prisma.facebookFeedSession.findFirst({
            where: { listingId: Number(propertyId), status: "PUBLISHED", postType: postType || "carousel" },
            orderBy: { createdAt: "desc" }
        });
        sourceId = fbSession?.publishedPostId || null;

        if (!sourceId) {
            const anyFbSession = await prisma.facebookFeedSession.findFirst({
                where: { listingId: Number(propertyId), status: "PUBLISHED" },
                orderBy: { createdAt: "desc" }
            });
            sourceId = anyFbSession?.publishedPostId || null;
        }

        if (!sourceId) {
            return NextResponse.json({ success: false, error: "Publicação no Facebook não encontrada para impulsionar." }, { status: 404 });
        }
    } else if (platform === "meta") {
        const igSession = await prisma.instagramPreviewSession.findFirst({
            where: { listingId: Number(propertyId), status: "PUBLISHED", postType: postType || "carousel" },
            orderBy: { createdAt: "desc" }
        });
        sourceId = igSession?.publishedMediaId || property.instagramMediaId || null;
        
        if (!sourceId) {
            const fbSession = await prisma.facebookFeedSession.findFirst({
                where: { listingId: Number(propertyId), status: "PUBLISHED", postType: postType || "carousel" },
                orderBy: { createdAt: "desc" }
            });
            sourceId = fbSession?.publishedPostId || null;
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

    const endTime = new Date();
    endTime.setDate(endTime.getDate() + durationDays);

    const stateName = property.state || "Brasil";

    // Informações de geolocalização e raio da Meta Ads
    const targetLat = targetLatitude !== undefined && targetLatitude !== null && !isNaN(Number(targetLatitude)) ? Number(targetLatitude) : null;
    const targetLng = targetLongitude !== undefined && targetLongitude !== null && !isNaN(Number(targetLongitude)) ? Number(targetLongitude) : null;
    const effectiveRadiusKm = Math.max(25, Math.round(Number(targetRadiusKm) || 30));

    const targetingDescription = (targetLat !== null && targetLng !== null)
        ? `Raio de ${effectiveRadiusKm} km (${property.city || stateName}) • 18 a 65+ anos`
        : `${stateName} • 18 a 65+ anos`;

    const adsetNameGenerated = (targetLat !== null && targetLng !== null)
        ? `AdSet RealStock Raio ${effectiveRadiusKm}km (${property.city || stateName})`
        : `AdSet RealStock ${property.state || stateName}`;

    // Helper para ativar boost local no banco se a Meta API falhar ou não estiver configurada
    const activateLocalBoostFallback = async (reason: string) => {
        await prisma.property.update({
            where: { id: Number(propertyId) },
            data: { 
                boostedUntil: endTime, 
                metaBoostedUntil: endTime 
            }
        });

        const calculatedEndFormatted = endTime.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });

        const campaignDetails = {
            campaignName: Number(propertyId) === 0 ? "RealStock Boost Portfólio Geral" : `RealStock Boost Propriedade ${propertyId}`,
            adsetName: (targetLat !== null && targetLng !== null) ? `Destaque RealStock Raio ${effectiveRadiusKm}km` : `Destaque RealStock ${stateName}`,
            adName: Number(propertyId) === 0 ? "Anúncio Portfólio Geral" : `Anuncio Turbinado Prop ${propertyId}`,
            platform: "Portal RealStock (Vitrine & Destaque)",
            status: "Ativo",
            adStatus: "Veiculando com Prioridade Máxima no Portal",
            targeting: targetingDescription,
            dailyBudget: Number(dailyBudget),
            durationDays: durationDays,
            totalInvestment: Number(dailyBudget) * durationDays,
            endDate: calculatedEndFormatted,
            format: postType === "reels" ? "Vídeo Reels" : "Carrossel de Fotos",
            cta: "Ver Detalhes do Imóvel",
            targetUrl: `https://www.realstock.com.br/imovel/${propertyId}`
        };

        return NextResponse.json({ 
            success: true, 
            message: "🚀 Anúncio turbinado com sucesso no RealStock!",
            warning: `O anúncio foi ativado com destaque no portal RealStock por ${durationDays} dias. Sincronização externa Meta: ${reason}`,
            campaignDetails
        });
    };

    if (!adAccountId || !pageId || !igToken) {
       console.warn("FB Marketing API não configurada totalmente (.env). Ativando boost no portal RealStock.");
       return activateLocalBoostFallback("Credenciais da Meta Ads pendentes de configuração.");
    }

    const BASE_GRAPH = "https://graph.facebook.com/v19.0";
    
    // 1. OBTÉM GEOLOCATIONS PARA TARGET (RAIO PERSONALIZADO OU REGIÃO)
    let geo_locations: any = null;

    if (targetLat !== null && targetLng !== null) {
        // Meta Special Ad Category HOUSING: raio mínimo de 15 milhas (~24-25 km)
        geo_locations = {
            custom_locations: [
                {
                    latitude: targetLat,
                    longitude: targetLng,
                    radius: effectiveRadiusKm,
                    distance_unit: "kilometer"
                }
            ]
        };
    } else {
        let regionKey = null;
        try {
            const geoRes = await fetch(`${BASE_GRAPH}/search?type=adgeolocation&q=${encodeURIComponent(stateName)}&country_code=BR&location_types=["region"]&access_token=${igToken}`);
            const geoData = await geoRes.json();
            if (geoData.data && geoData.data.length > 0) {
                 regionKey = geoData.data[0].key;
            }
        } catch(e) { console.error("FB GEO ERROR", e); }

        geo_locations = regionKey ? { regions: [{ key: regionKey }] } : { countries: ["BR"] };
    }

    const targeting = {
       geo_locations,
       publisher_platforms: platform === "meta" ? ["facebook", "instagram"] : [platform === "instagram" ? "instagram" : "facebook"],
       ...(platform === "instagram" ? { instagram_positions: ["stream", "story"] } : platform === "facebook" ? { facebook_positions: ["feed"] } : { instagram_positions: ["stream", "story"], facebook_positions: ["feed"] })
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
        const errorMsg = campData.error?.message || "Conta com pendência ou em validação na Meta.";
        return activateLocalBoostFallback(errorMsg);
    }
    const campaignId = campData.id;

    // 3. CRIA ADSET (Orçamento e Duração)
    const dailyBudgetCents = Math.floor(Number(dailyBudget) * 100);

    const adSetForm = new URLSearchParams();
    adSetForm.append("name", adsetNameGenerated);
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
        const errorMsg = adSetData.error?.message || "Erro no conjunto de anúncios da Meta.";
        return activateLocalBoostFallback(errorMsg);
    }
    const adSetId = adSetData.id;

    // 4. CRIA CRIATIVO USANDO MÍDIA ORGÂNICA DO IG
    let processAppUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "https://www.realstock.com.br";
    if (processAppUrl.includes("localhost")) {
         processAppUrl = "https://www.realstock.com.br";
    }
    const propertyLink = `${processAppUrl}/imovel/${property.id}`;

    let creativeData: any = null;

    if (platform === "instagram" && sourceId && !sourceId.startsWith("Prop_")) {
        // Tentativa 1: source_instagram_media_id direto com Call To Action (Formato nativo Meta)
        try {
            const formB = new URLSearchParams();
            formB.append("name", `Criativo Boost Prop ${propertyId}`);
            formB.append("source_instagram_media_id", sourceId);
            formB.append("call_to_action", JSON.stringify({
                type: "LEARN_MORE",
                value: { link: propertyLink }
            }));
            formB.append("access_token", igToken);
            const resB = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: formB });
            creativeData = await resB.json();
        } catch (e) {
            console.error("ERRO FORMAT B IG CREATIVE:", e);
        }

        // Tentativa 2: Fallback direto source_instagram_media_id
        if (!creativeData || !creativeData.id) {
            try {
                const formA = new URLSearchParams();
                formA.append("name", `Criativo Boost Prop ${propertyId}`);
                formA.append("source_instagram_media_id", sourceId);
                formA.append("access_token", igToken);
                const resA = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: formA });
                creativeData = await resA.json();
            } catch (e) {}
        }

        // Tentativa 3: object_story_spec
        if (!creativeData || !creativeData.id) {
            let igActorId = igUserId;
            if (!igActorId) {
                try {
                    const pageRes = await fetch(`${BASE_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
                    const pageData = await pageRes.json();
                    igActorId = pageData.instagram_business_account?.id;
                } catch (e) {}
            }

            if (igActorId) {
                const formC = new URLSearchParams();
                formC.append("name", `Criativo Boost Prop ${propertyId}`);
                formC.append("object_story_spec", JSON.stringify({
                    instagram_actor_id: igActorId,
                    source_instagram_media_id: sourceId
                }));
                formC.append("access_token", igToken);
                const resC = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: formC });
                creativeData = await resC.json();
            }
        }
    } else if (platform === "facebook" && sourceId && !sourceId.startsWith("Prop_")) {
        const facebookForm = new URLSearchParams();
        facebookForm.append("name", `Criativo Boost Prop ${propertyId}`);
        facebookForm.append("object_story_id", sourceId);
        facebookForm.append("call_to_action", JSON.stringify({
            type: "LEARN_MORE",
            value: {
                link: propertyLink
            }
        }));
        facebookForm.append("access_token", igToken);
        const fbRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: facebookForm });
        creativeData = await fbRes.json();
    }

    if (!creativeData || !creativeData.id) {
        console.error("ERRO CRIATIVO FB", creativeData);
        let errorDetail = creativeData?.error?.message || "Erro ao vincular mídia";
        if (creativeData?.error?.code === 1 || errorDetail.includes("unknown error")) {
            errorDetail = "Conta Meta com pendência de faturamento ou permissões no Gerenciador de Anúncios.";
        }
        return activateLocalBoostFallback(errorDetail);
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
        return activateLocalBoostFallback(adData.error?.message || "Anúncio recusado pela Meta.");
    }

    await prisma.metaAdsSession.create({
        data: {
             listingId: Number(propertyId),
             campaignId: campaignId,
             status: "IN_PROCESS",
             budget: Number(dailyBudget) * durationDays,
             budgetDays: durationDays,
             platform: "meta"
        }
    });

    await prisma.property.update({
        where: { id: Number(propertyId) },
        data: { 
            boostedUntil: endTime, 
            metaBoostedUntil: endTime,
            metaAdId: adData.id,
            metaCampaignId: campaignId
        }
    });

    const calculatedEndFormatted = endTime.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    const campaignDetails = {
        campaignName: Number(propertyId) === 0 ? "RealStock Boost Portfólio Geral" : `RealStock Boost Propriedade ${propertyId}`,
        adsetName: adsetNameGenerated,
        adName: Number(propertyId) === 0 ? "Anúncio Portfólio Geral" : `Anuncio Turbinado Prop ${propertyId}`,
        platform: platform === "google" 
            ? "Google Ads (Rede de Pesquisa)" 
            : (platform === "facebook" ? "Facebook (Meta Ads)" : "Instagram & Facebook (Meta Ads)"),
        status: "Ativo",
        adStatus: "Em Análise pela IA da Meta (Aprovação em poucos minutos)",
        targeting: targetingDescription,
        dailyBudget: Number(dailyBudget),
        durationDays: durationDays,
        totalInvestment: Number(dailyBudget) * durationDays,
        endDate: calculatedEndFormatted,
        format: postType === "reels" ? "Reels IA (Vídeo)" : "Carrossel de Fotos",
        cta: "Botão Saiba Mais (Link Direto)",
        targetUrl: `https://www.realstock.com.br/imovel/${propertyId}`
    };

    return NextResponse.json({ 
        success: true, 
        message: "🚀 Anúncio criado e turbinado com sucesso pela Marketing API!",
        campaignDetails
    });

  } catch (error: any) {
    console.error("PAYPAL CAPTURE BOOST ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno: " + error.message }, { status: 500 });
  }
}
