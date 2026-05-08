import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const propertyId = Number(resolvedParams.id);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId: user.id },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Anúncio não encontrado" }, { status: 404 });
    }

    // Get other sessions
    const goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: propertyId, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    });

    const meSession = await prisma.metaAdsSession.findFirst({
        where: { listingId: propertyId },
        orderBy: { createdAt: 'desc' }
    });
    const metaSessionStatus = meSession?.status || null;

    // 1. META ADS INSIGHTS (PAID PERFORMANCE)
    const adsSessions = await prisma.metaAdsSession.findMany({
        where: { listingId: propertyId },
        orderBy: { createdAt: "desc" }
    });

    let paidMetrics = { reach: 0, views: 0, clicks: 0, spend: 0 };
    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const pageToken = process.env.INSTAGRAM_ACCESS_TOKEN; // Usar o token do IG que tem permissão total

    if (adAccountId && pageToken) {
        // IDs para testar (Campanha da Sessão + IDs diretos do imóvel)
        const targetIds = [
            property.metaAdId,
            property.metaCampaignId,
            ...adsSessions.map(s => s.campaignId)
        ].filter(Boolean);

        for (const tId of targetIds) {
            try {
                // Usar date_preset=maximum para garantir que pegamos o acumulado total
                const adsRes = await fetch(`https://graph.facebook.com/v19.0/${tId}/insights?fields=reach,impressions,inline_link_clicks,spend&date_preset=maximum&access_token=${pageToken}`);
                const adsData = await adsRes.json();
                if (adsData?.data?.[0]) {
                    const d = adsData.data[0];
                    const r = parseInt(d.reach || "0");
                    const v = parseInt(d.impressions || "0");
                    const c = parseInt(d.inline_link_clicks || "0");
                    const s = parseFloat(d.spend || "0");
                    
                    // Usar o maior valor encontrado para evitar duplicação se consultarmos campanha e anúncio
                    if (r > paidMetrics.reach) paidMetrics.reach = r;
                    if (v > paidMetrics.views) paidMetrics.views = v;
                    if (c > paidMetrics.clicks) paidMetrics.clicks = c;
                    if (s > paidMetrics.spend) paidMetrics.spend = s;
                }
            } catch (e) {}
        }
    }

    const insights: any = {
        metaAds: adsSessions.length > 0 || property.metaAdId ? paidMetrics : null,
        instagram: null,
        facebook: null,
        google: null
    };

    // 2. INSTAGRAM ORGANIC INSIGHTS
    const igSessions = await prisma.instagramPreviewSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    
    const igMediaIds = igSessions.map(s => ({ id: s.publishedMediaId, type: s.postType }));
    if (property.instagramMediaId && !igMediaIds.find(i => i.id === property.instagramMediaId)) {
        igMediaIds.push({ id: property.instagramMediaId, type: 'reels' });
    }

    const instagramPosts: any[] = [];
    for (const item of igMediaIds) {
        if (!item.id) continue;
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
                const baseRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}?fields=like_count,comments_count,timestamp,media_type&access_token=${igToken}`);
                const baseData = await baseRes.json();
                
                if (baseData && !baseData.error) {
                    let postType = item.type;
                    if (baseData.media_type === 'VIDEO') postType = 'reels';
                    else if (baseData.media_type === 'CAROUSEL_ALBUM') postType = 'carousel';

                    let views = 0;
                    let reach = 0;
                    let shares = 0;

                    try {
                        const metrics = 'views,reach,saved,total_interactions';
                        const insRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}/insights?metric=${metrics}&access_token=${igToken}`);
                        const insData = await insRes.json();
                        
                        if (insData && insData.data) {
                            // Pegar o valor de 'views' (padrão 2026)
                            const vObj = insData.data.find((m: any) => m.name === 'views');
                            if (vObj) views = vObj.values?.[0]?.value || 0;
                            
                            reach = insData.data.find((m: any) => m.name === 'reach')?.values?.[0]?.value || 0;
                        }

                        // Tentar buscar o video_id oculto apenas para VIDEOS (Turbinado)
                        if (baseData.media_type === 'VIDEO') {
                            const vFieldsRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}?fields=video_id&access_token=${igToken}`);
                            const vFieldsData = await vFieldsRes.json();
                            
                            if (vFieldsData && vFieldsData.video_id) {
                                const vId = vFieldsData.video_id;
                                const fbVidRes = await fetch(`https://graph.facebook.com/v19.0/${vId}?fields=views,play_count,video_play_count&access_token=${igToken}`);
                                const fbVidData = await fbVidRes.json();
                                if (fbVidData && !fbVidData.error) {
                                    const vTotal = Math.max(fbVidData.views || 0, fbVidData.play_count || 0, fbVidData.video_play_count || 0);
                                    if (vTotal > views) views = vTotal;
                                }
                            }
                        }

                        // 3. Tentar buscar métricas pagas via Insights de Anúncio
                        try {
                            const adsRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}/insights?metric=video_views,impressions&breakdowns=ad_id&access_token=${igToken}`);
                            const adsData = await adsRes.json();
                            if (adsData && adsData.data) {
                                const paidViews = adsData.data.find((m: any) => m.name === 'video_views' || m.name === 'impressions')?.values?.[0]?.value || 0;
                                if (paidViews > views) views = paidViews;
                            }
                        } catch(e) {}
                    } catch(e) { console.error("IG Insights Metric Error (V2-ANTIGRAVITY):", e); }

                    instagramPosts.push({
                        type: postType,
                        likes: baseData.like_count || 0,
                        comments: baseData.comments_count || 0,
                        // Garantir que pegamos o maior valor orgânico ou pago
                        views: postType === 'reels' ? Math.max(views, paidMetrics.views) : Math.max(views, 0),
                        reach: postType === 'reels' ? Math.max(reach, paidMetrics.reach) : reach,
                        shares,
                        publishedDate: baseData.timestamp
                    });
                }
            }
        } catch(e) { console.error("IG ORGANIC ERROR", e); }
    }
    insights.instagram = { posts: instagramPosts };

    // FACEBOOK ORGANIC INSIGHTS
    const fbSessions = await prisma.facebookFeedSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });

    const isBoosted = !!(property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date()) || 
                      !!(property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date()) ||
                      !!property.instagramMediaId || fbSessions.length > 0;

    const facebookPosts: any[] = [];
    if (fbSessions.length > 0) {
        try {
            const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            const pageId = process.env.FACEBOOK_PAGE_ID;
            if (userToken && pageId) {
                const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
                const pageTokenData = await pageTokenRes.json();
                const pageInfo = pageTokenData.data?.find((p: any) => p.id === pageId);

                if (pageInfo && pageInfo.access_token) {
                    for (const fbSession of fbSessions) {
                        if (!fbSession.publishedPostId) continue;
                        
                        let fbData: any = null;
                        let metrics: any = { views: 0, likes: 0, comments: 0, shares: 0 };

                        // 1. Tentar capturar o MÍNIMO necessário para exibir o post
                        const basicFields = ["id", "shares", "comments.summary(total_count)", "likes.summary(total_count)", "updated_time", "object_id", "views"];
                        
                        // 1. Tentar capturar o MÍNIMO necessário para exibir o post
                        try {
                            // Tentativa 1: Completa
                            const res1 = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,object_id,views&access_token=${pageInfo.access_token}`);
                            const data1 = await res1.json();
                            
                            if (data1 && !data1.error) {
                                fbData = data1;
                            } else {
                                // Tentativa 2: Sem campos problemáticos (shares/object_id)
                                const res2 = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=id,likes.summary(total_count),comments.summary(total_count),updated_time,views&access_token=${pageInfo.access_token}`);
                                const data2 = await res2.json();
                                if (data2 && !data2.error) {
                                    fbData = data2;
                                } else {
                                    // Tentativa 3: Ultra-básica (Apenas para não sumir do painel)
                                    const res3 = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?access_token=${pageInfo.access_token}`);
                                    const data3 = await res3.json();
                                    if (data3 && !data3.error) fbData = data3;
                                }
                            }

                            if (fbData) {
                                metrics.likes = fbData.likes?.summary?.total_count || 0;
                                metrics.comments = fbData.comments?.summary?.total_count || 0;
                                metrics.shares = fbData.shares?.count || 0;
                                metrics.views = fbData.views || 0;
                            }
                        } catch(e) {}

                        // 2. Enriquecer com métricas de INSIGHTS (Um por um para não quebrar)
                        if (fbData) {
                            const targetId = fbData.object_id || fbSession.publishedPostId;
                            
                            if (targetId !== pageId) {
                                const metricsToTry = ['post_impressions', 'post_video_views', 'post_video_views_organic', 'post_impressions_unique'];
                                for (const mName of metricsToTry) {
                                    try {
                                        const vRes = await fetch(`https://graph.facebook.com/v19.0/${targetId}/insights?metric=${mName}&access_token=${pageInfo.access_token}`);
                                        const vData = await vRes.json();
                                        if (vData?.data?.[0]?.values?.[0]?.value) {
                                            const val = vData.data[0].values[0].value;
                                            if (val > metrics.views) metrics.views = val;
                                        }
                                    } catch(e) {}
                                }
                            }

                            facebookPosts.push({
                                type: fbSession.postType || 'carousel',
                                likes: metrics.likes,
                                comments: metrics.comments,
                                shares: metrics.shares,
                                views: metrics.views,
                                publishedDate: fbData.updated_time || fbSession.updatedAt
                            });
                        }
                    }
                }
            }
        } catch(e) { console.error("FACEBOOK ORGANIC EXCEPTION:", e); }
    }
    insights.facebook = { posts: facebookPosts };

    // 3. META ADS INSIGHTS
    if (property.metaAdId) {
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
                const adInsRes = await fetch(`https://graph.facebook.com/v19.0/${property.metaAdId}/insights?fields=impressions,clicks,reach,spend,actions&access_token=${igToken}`);
                const adInsData = await adInsRes.json();
                if (adInsData.data && adInsData.data[0]) {
                    const stats = adInsData.data[0];
                    const paidImp = Number(stats.impressions || 0);
                    const actions = stats.actions || [];
                    const paidLikes = parseInt(actions.find((a: any) => a.action_type === "post_reaction" || a.action_type === "like")?.value || "0");

                    insights.metaAds = {
                        views: paidImp,
                        clicks: Number(stats.clicks || 0),
                        reach: Number(stats.reach || 0),
                        likes: paidLikes,
                        spend: stats.spend || "0"
                    };
                }
            }
        } catch(e) { console.error("META AD INSIGHTS ERROR", e); }
    }

    // 4. GOOGLE ADS INSIGHTS
    if (goSession) {
        const budget = Number(goSession.budget);
        if (goSession.campaignId && !goSession.campaignId.includes("MOCK")) {
            const adsData = await getGoogleAdsCampaignInsights(goSession.campaignId);
            if (adsData.success) {
                insights.google = {
                    clicks: adsData.clicks,
                    impressions: adsData.impressions,
                    ctr: adsData.ctr,
                    cpc: Number(adsData.cpc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                    budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                    activeDays: goSession.budgetDays
                };
            }
        } else {
            insights.google = {
                clicks: 0,
                impressions: 0,
                ctr: "0.0",
                cpc: "R$ 0,00",
                budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                activeDays: goSession.budgetDays
            };
        }
    }

    const igTotalViews = insights.instagram.posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
    const fbTotalViews = insights.facebook.posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);

    return NextResponse.json({
      success: true,
      title: property.title,
      city: property.city,
      state: property.state,
      totalImpact: igTotalViews + fbTotalViews + (insights.metaAds?.views || 0) + (insights.google?.impressions || 0),
      isBoosted,
      metaSessionStatus,
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS ROUTE ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
