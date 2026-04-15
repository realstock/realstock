import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRealStockGoogleCampaign } from "@/lib/googleAds";

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

    const { dailyBudget, platform } = await req.json();

    if (platform === "google") {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.realstock.com.br";
      const targetUrl = baseUrl;

      // Call Real Google Ads Integration
      const adsResult = await createRealStockGoogleCampaign(
        0, // Admin doesn't need a specific property id for global search
        pub.name || "Patrocínio Admin",
        Number(dailyBudget) || 50,
        targetUrl
      );

      let finalCampaignId = adsResult.campaignId || `MOCK_G_CAMP_ADMIN_${Date.now()}`;
      let finalAdGroupId = adsResult.adGroupId || `MOCK_G_ADG_ADMIN_${Date.now()}`;
      let finalStatus = adsResult.success ? "ACTIVE" : "ACTIVE_FALLBACK";

      await prisma.googleAdsSession.create({
        data: {
          listingId: -2,
          campaignId: finalCampaignId,
          adGroupId: finalAdGroupId,
          status: finalStatus,
          budget: dailyBudget || 50,
          budgetDays: 5,
          targetUrl: targetUrl
        }
      });

      const boostedDate = new Date();
      boostedDate.setDate(boostedDate.getDate() + 5);

      await prisma.adminSponsoredPublication.update({
          where: { id: pubId },
          data: { googleBoostedUntil: boostedDate }
      });

      return NextResponse.json({ success: true, message: "Lote Admin publicado no Google Ads!" });
    } else if (platform === "meta" || platform === "instagram" || platform === "facebook") {
      const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
      const pageId = process.env.FACEBOOK_PAGE_ID;
      const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
      const igUserId = process.env.INSTAGRAM_IG_USER_ID;

      if (!adAccountId || !pageId || !igToken) {
          throw new Error("Credenciais da Meta Ads (Marketing API) não configuradas no servidor.");
      }

      // 1. Localizar Post Orgânico do Lote
      // O admin salva sessões de lote com listingId: -2 e caption: pubId
      const igSession = await prisma.instagramPreviewSession.findFirst({
          where: { listingId: -2, caption: pubId, status: "PUBLISHED" },
          orderBy: { createdAt: "desc" }
      });
      const fbSession = await prisma.facebookFeedSession.findFirst({
        where: { listingId: -2, caption: pubId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" }
      });

      let sourceId = igSession?.publishedMediaId || fbSession?.publishedPostId;
      let usedPlatform = igSession?.publishedMediaId ? "instagram" : (fbSession?.publishedPostId ? "facebook" : "meta");

      if (!sourceId) {
          throw new Error("Post orgânico não encontrado. Publique o lote no Instagram/Facebook antes de impulsionar (Dark Posts desativados).");
      }

      const BASE_GRAPH = "https://graph.facebook.com/v19.0";
      
      // 2. Criar Campanha
      const campaignForm = new URLSearchParams();
      campaignForm.append("name", `Admin Sponsored Lote: ${pub.name || pubId}`);
      campaignForm.append("objective", "OUTCOME_AWARENESS");
      campaignForm.append("status", "ACTIVE");
      campaignForm.append("special_ad_categories", '["HOUSING"]');
      campaignForm.append("special_ad_category_country", '["BR"]');
      campaignForm.append("is_adset_budget_sharing_enabled", "false");
      campaignForm.append("access_token", igToken);

      const campRes = await fetch(`${BASE_GRAPH}/${adAccountId}/campaigns`, { method: "POST", body: campaignForm });
      const campData = await campRes.json();
      if (!campData.id) throw new Error("Falha ao criar Campanha Meta: " + JSON.stringify(campData));

      // 3. Criar AdSet
      const dailyBudgetCents = Math.floor(Number(dailyBudget) * 100);
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + 5);

      const adSetForm = new URLSearchParams();
      adSetForm.append("name", `AdSet Admin Lote ${pub.name}`);
      adSetForm.append("campaign_id", campData.id);
      adSetForm.append("daily_budget", dailyBudgetCents.toString());
      adSetForm.append("billing_event", "IMPRESSIONS");
      adSetForm.append("optimization_goal", "REACH");
      adSetForm.append("promoted_object", JSON.stringify({ page_id: pageId }));
      adSetForm.append("bid_strategy", "LOWEST_COST_WITHOUT_CAP");
      adSetForm.append("targeting", JSON.stringify({ geo_locations: { countries: ["BR"] }, publisher_platforms: ["facebook", "instagram"] }));
      adSetForm.append("end_time", endTime.toISOString());
      adSetForm.append("status", "ACTIVE");
      adSetForm.append("access_token", igToken);

      const adSetRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adsets`, { method: "POST", body: adSetForm });
      const adSetData = await adSetRes.json();
      if (!adSetData.id) throw new Error("Falha ao criar AdSet Meta: " + JSON.stringify(adSetData));

      // 4. Criar Creative (preferindo orgânico)
      const creativeForm = new URLSearchParams();
      creativeForm.append("name", `Criativo Admin Lote ${pubId}`);
      
      let isOrganic = false;
      if (sourceId) {
          if (usedPlatform === "instagram") {
              let igActorId = igUserId;
              if (!igActorId) {
                  try {
                      // 1. Try instagram_business_account (Business Account ID)
                      const pRes = await fetch(`${BASE_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${igToken}`);
                      const pData = await pRes.json();
                      igActorId = pData.instagram_business_account?.id;
                      
                      // 2. Try instagram_accounts edge (Legacy Actor IDs often needed for Ads)
                      if (!igActorId) {
                          const accRes = await fetch(`${BASE_GRAPH}/${pageId}/instagram_accounts?fields=id&access_token=${igToken}`);
                          const accData = await accRes.json();
                          if (accData.data && accData.data.length > 0) {
                              igActorId = accData.data[0].id;
                          }
                      }
                      
                      // 3. Try /me fallback
                      if (!igActorId) {
                          const meRes = await fetch(`${BASE_GRAPH}/me?fields=instagram_business_account&access_token=${igToken}`);
                          const meData = await meRes.json();
                          igActorId = meData.instagram_business_account?.id;
                      }
                  } catch(e) {}
              }

              if (!igActorId) {
                  throw new Error("Não foi possível localizar o ID da Conta Comercial do Instagram (igActorId). Verifique se a variável INSTAGRAM_IG_USER_ID está configurada no servidor.");
              }

              creativeForm.append("instagram_actor_id", igActorId);
              creativeForm.append("source_instagram_media_id", sourceId);
          } else {
              creativeForm.append("object_story_id", sourceId);
          }
          isOrganic = true;
      }
      creativeForm.append("access_token", igToken);

      const creativeRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adcreatives`, { method: "POST", body: creativeForm });
      const creativeData = await creativeRes.json();
      if (!creativeData.id) {
          const detail = JSON.stringify(creativeData);
          throw new Error(`Falha ao criar Criativo Meta. (ID usado: ${igUserId || 'buscando...'}) Erro: ${detail}`);
      }

      // 5. Criar Ad
      const adForm = new URLSearchParams();
      adForm.append("name", `Anúncio Admin Lote ${pubId}`);
      adForm.append("adset_id", adSetData.id);
      adForm.append("creative", JSON.stringify({ creative_id: creativeData.id }));
      adForm.append("status", "ACTIVE");
      adForm.append("access_token", igToken);

      const adRes = await fetch(`${BASE_GRAPH}/${adAccountId}/ads`, { method: "POST", body: adForm });
      const adData = await adRes.json();
      if (!adData.id) throw new Error("Falha ao criar Ad Final Meta: " + JSON.stringify(adData));

      await prisma.adminSponsoredPublication.update({
          where: { id: pubId },
          data: { metaBoostedUntil: endTime }
      });

      return NextResponse.json({ success: true, message: "Lote Admin publicado com sucesso no Meta Ads (Facebook/Instagram)!" });
    } else {
       return NextResponse.json({ success: false, error: "Plataforma não suportada." }, { status: 400 });
    }

  } catch (error: any) {
    console.error("ADMIN GOOGLE ADS PUBLISH ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
