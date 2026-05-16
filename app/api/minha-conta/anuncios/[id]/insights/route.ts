import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";
import { getPortfolioListingId } from "@/lib/portfolioId";

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

    const isPortfolio = propertyId === 0;
    // For portfolio, use the user-specific listingId
    const effectiveListingId = isPortfolio ? getPortfolioListingId(user.id) : propertyId;

    // Para portfólio (id=0), criamos um objeto sintético com dados do usuário
    let property: any;
    if (isPortfolio) {
      property = {
        id: 0,
        title: `Portfólio de ${user.name || user.email}`,
        city: null,
        state: null,
        ownerId: user.id,
        metaAdId: null,
        metaCampaignId: null,
        instagramMediaId: null,
        instagramPermalink: null,
        metaBoostedUntil: user.portfolioBoostedUntil,
      };
    } else {
      property = await prisma.property.findFirst({
        where: { id: propertyId, ownerId: user.id },
      });

      if (!property) {
        return NextResponse.json({ success: false, error: "Anúncio não encontrado" }, { status: 404 });
      }
    }


    // Get other sessions — also fallback to listingId=0 for old portfolio campaigns
    let goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: effectiveListingId, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    });
    // Backward compat: campaigns created before portfolio ID convention used listingId=0
    if (!goSession && isPortfolio) {
        goSession = await prisma.googleAdsSession.findFirst({
            where: { listingId: 0, status: { contains: "ACTIVE" } },
            orderBy: { createdAt: 'desc' }
        });
    }

    const meSession = await prisma.metaAdsSession.findFirst({
        where: { listingId: effectiveListingId },
        orderBy: { createdAt: 'desc' }
    });
    // Backward compat for portfolio
    let finalMeSession = meSession;
    if (!finalMeSession && isPortfolio) {
        finalMeSession = await prisma.metaAdsSession.findFirst({
            where: { listingId: 0 },
            orderBy: { createdAt: 'desc' }
        });
    }
    const metaSessionStatus = finalMeSession?.status || null;

    // 1. META ADS INSIGHTS (PAID PERFORMANCE)
    let paidMetrics = { reach: 0, views: 0, clicks: 0, spend: 0, likes: 0 };
    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const pageToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (pageToken) {
        // Coletar todos os IDs possíveis de anúncios e campanhas
        let adsSessions = await prisma.metaAdsSession.findMany({
            where: { listingId: effectiveListingId },
        });
        // Fallback for portfolio
        if (adsSessions.length === 0 && isPortfolio) {
            adsSessions = await prisma.metaAdsSession.findMany({
                where: { listingId: 0 },
            });
        }
        const targetIds = new Set<string>();
        if (property.metaAdId) targetIds.add(String(property.metaAdId));
        if (property.metaCampaignId) targetIds.add(String(property.metaCampaignId));
        adsSessions.forEach(s => { if (s.campaignId) targetIds.add(s.campaignId); });

        for (const tId of targetIds) {
            try {
                const adsRes = await fetch(`https://graph.facebook.com/v19.0/${tId}/insights?fields=reach,impressions,inline_link_clicks,spend,actions&date_preset=maximum&access_token=${pageToken}`);
                const adsData = await adsRes.json();
                
                if (adsData?.data?.[0]) {
                    const d = adsData.data[0];
                    const r = parseInt(d.reach || "0");
                    const v = parseInt(d.impressions || "0");
                    const s = parseFloat(d.spend || "0");

                    // Coletar cliques de diversas formas (inline ou através de ações)
                    let c = parseInt(d.inline_link_clicks || "0");
                    if (d.actions) {
                        const linkClicks = d.actions.find((a: any) => a.action_type === 'link_click')?.value;
                        if (linkClicks) c = Math.max(c, parseInt(linkClicks));
                        
                        // Também somar likes/comments vindos do boost para compor o engajamento
                        const reactions = d.actions.find((a: any) => a.action_type === 'post_reaction' || a.action_type === 'like')?.value;
                        if (reactions) paidMetrics.likes = (paidMetrics.likes || 0) + parseInt(reactions);
                    }
                    
                    paidMetrics.reach = Math.max(paidMetrics.reach, r);
                    paidMetrics.views = Math.max(paidMetrics.views, v);
                    paidMetrics.clicks = Math.max(paidMetrics.clicks, c);
                    paidMetrics.spend = Math.max(paidMetrics.spend, s);
                }
            } catch (e) {
                console.error(`Error fetching insights for ${tId}:`, e);
            }
        }
    }

    const insights: any = {
        metaAds: (property.metaAdId || property.metaCampaignId) ? paidMetrics : null,
        instagram: { posts: [] },
        facebook: { posts: [] },
        google: null
    };

    // 2. INSTAGRAM ORGANIC INSIGHTS
    let igSessions = await prisma.instagramPreviewSession.findMany({
        where: { listingId: effectiveListingId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    // Fallback for portfolio
    if (igSessions.length === 0 && isPortfolio) {
        igSessions = await prisma.instagramPreviewSession.findMany({
            where: { listingId: 0, status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
        });
    }
    console.log(`[Insights] Found ${igSessions.length} IG sessions for property ${propertyId}`);
    
    // Mostrar apenas o post mais recente de cada tipo (reels e carousel)
    const latestReels = igSessions.find(s => s.postType === 'reels');
    const latestCarousel = igSessions.find(s => s.postType !== 'reels');
    const dedupedIgSessions = [latestReels, latestCarousel].filter(Boolean) as typeof igSessions;

    const igMediaIds = dedupedIgSessions.map(s => ({ id: s.publishedMediaId, type: s.postType }));
    if (property.instagramMediaId && !igMediaIds.find(i => i.id === property.instagramMediaId)) {
        igMediaIds.push({ id: property.instagramMediaId, type: 'reels' });
    }

    let graphApiAvailable = false; // Track if Graph API is responding

    for (let index = 0; index < igMediaIds.length; index++) {
        const item = igMediaIds[index];
        if (!item.id) continue;

        // Identificar se esta é a mídia principal do impulsionamento
        const isMainBoostedMedia = item.id === property.instagramMediaId || (igMediaIds.length === 1) || (index === 0 && !property.instagramMediaId);

        // Base record always added from DB data
        const baseRecord: any = {
            type: item.type || 'carousel',
            likes: 0,
            comments: 0,
            views: 0,
            reach: 0,
            publishedDate: null,
            permalink: null,
        };

        // Try to find permalink from session validationReport
        const matchSession = igSessions.find(s => s.publishedMediaId === item.id);
        if (matchSession?.validationReport && typeof matchSession.validationReport === 'object') {
            baseRecord.permalink = (matchSession.validationReport as any).permalink || null;
            baseRecord.publishedDate = matchSession.createdAt;
        }

        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
                // Usando v21.0 para maior estabilidade em métricas recentes
                const baseRes = await fetch(`https://graph.facebook.com/v21.0/${item.id}?fields=like_count,comments_count,timestamp,media_type&access_token=${igToken}`);
                const baseData = await baseRes.json();
                
                if (baseData && !baseData.error) {
                    graphApiAvailable = true;
                    baseRecord.likes = baseData.like_count || 0;
                    baseRecord.comments = baseData.comments_count || 0;
                    baseRecord.publishedDate = baseData.timestamp || baseRecord.publishedDate;
                    
                    const isVideo = baseData.media_type === 'VIDEO';
                    baseRecord.type = isVideo ? 'reels' : (baseData.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'image');

                    let views = 0;
                    let reach = 0;

                    try {
                        // Tentar o máximo de métricas possíveis para contornar a instabilidade
                        // A partir da v22.0 (e v21.0 dependendo da conta), as métricas foram unificadas.
                        // 'reach', 'views' e 'saved' funcionam para Reels e Carrossel.
                        const metricName = 'reach,saved,views';
                        
                        const insRes = await fetch(`https://graph.facebook.com/v21.0/${item.id}/insights?metric=${metricName}&access_token=${igToken}`);
                        const insData = await insRes.json();
                        
                        if (insData?.data) {
                            const vObj = insData.data.find((m: any) => m.name === 'views' || m.name === 'plays' || m.name === 'impressions' || m.name === 'carousel_album_impressions');
                            if (vObj) views = Math.max(views, vObj.values?.[0]?.value || 0);
                            
                            const rObj = insData.data.find((m: any) => m.name === 'reach' || m.name === 'carousel_album_reach');
                            if (rObj) reach = Math.max(reach, rObj.values?.[0]?.value || 0);
                        } else if (insData.error) {
                            console.warn(`[Insights] Metric error for ${item.id} (${metricName}):`, insData.error.message);
                            // Se der erro de permissão/token (190), marcamos como indisponível. Erro 100 é apenas parametro inválido, não tira a API do ar.
                            if (insData.error.code === 190) {
                                graphApiAvailable = false;
                            }
                        }
                    } catch(e) {
                        console.error("IG INSIGHTS METRIC FETCH ERROR", e);
                    }

                    baseRecord.views = Math.max(views, isMainBoostedMedia ? paidMetrics.views : 0);
                    baseRecord.reach = Math.max(reach, isMainBoostedMedia ? paidMetrics.reach : 0);
                    baseRecord.likes = Math.max(baseRecord.likes, isMainBoostedMedia ? paidMetrics.likes : 0);
                } else {
                    console.warn(`[Insights] IG API error for ${item.id}:`, baseData?.error?.message);
                    // Importante: Mesmo que a API de mídia falhe, usamos os dados do Boost se for a mídia principal
                    if (isMainBoostedMedia) {
                        baseRecord.views = paidMetrics.views;
                        baseRecord.reach = paidMetrics.reach;
                        baseRecord.likes = paidMetrics.likes;
                    }
                }
            }
        } catch(e) { console.error("IG ORGANIC ERROR", e); }

        insights.instagram.posts.push(baseRecord);
    }

    // 3. FACEBOOK ORGANIC INSIGHTS
    let fbSessions = await prisma.facebookFeedSession.findMany({
        where: { listingId: effectiveListingId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });

    // Fallback for portfolio
    if (fbSessions.length === 0 && isPortfolio) {
        fbSessions = await prisma.facebookFeedSession.findMany({
            where: { listingId: 0, status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
        });
    }

    // Mostrar apenas o post mais recente de cada tipo (reels e carousel)
    const latestFbReels = fbSessions.find(s => s.postType === 'reels');
    const latestFbCarousel = fbSessions.find(s => s.postType !== 'reels');
    const dedupedFbSessions = [latestFbReels, latestFbCarousel].filter(Boolean) as typeof fbSessions;

    console.log(`[Insights] Showing ${dedupedFbSessions.length} FB sessions (deduped) for property ${propertyId}`);

    if (dedupedFbSessions.length > 0) {
        const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const pageId = process.env.FACEBOOK_PAGE_ID;
        let fbToken = process.env.FACEBOOK_ACCESS_TOKEN;

        // Se não temos o token da página direto no ENV, tentamos obter via User Token (troca de token)
        if (!fbToken && userToken && pageId) {
            try {
                const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}`);
                const pageData = await pageRes.json();
                const pageInfo = pageData.data?.find((p: any) => p.id === pageId);
                if (pageInfo?.access_token) {
                    fbToken = pageInfo.access_token;
                }
            } catch (e) {
                console.error("[Insights] Falha ao trocar token de usuário por token de página:", e);
            }
        }

        for (const fbSession of dedupedFbSessions) {
            if (!fbSession.publishedPostId) continue;

            // Base record always added from DB
            const baseRecord: any = {
                type: fbSession.postType || 'carousel',
                likes: 0,
                comments: 0,
                shares: 0,
                views: 0,
                publishedDate: fbSession.createdAt,
                permalink: typeof fbSession.validationReport === 'object' ? (fbSession.validationReport as any)?.permalink : null,
            };

            if (fbToken) {
                try {
                    // Tentar v21.0 para Facebook também
                    const res = await fetch(`https://graph.facebook.com/v21.0/${fbSession.publishedPostId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,views,video_views&access_token=${fbToken}`);
                    const fbData = await res.json();
                    if (fbData && !fbData.error) {
                        baseRecord.likes = fbData.likes?.summary?.total_count || 0;
                        baseRecord.comments = fbData.comments?.summary?.total_count || 0;
                        baseRecord.shares = fbData.shares?.count || 0;
                        baseRecord.views = Math.max(fbData.views || 0, fbData.video_views || 0);
                        baseRecord.publishedDate = fbData.updated_time || fbSession.createdAt;
                    } else {
                        console.warn(`[Insights] FB API error for ${fbSession.publishedPostId}:`, fbData?.error?.message);
                    }
                } catch(e) { console.error("FB POST FETCH ERROR", e); }
            }

            insights.facebook.posts.push(baseRecord);
        }
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
        }
    }

    const igTotalViews = insights.instagram.posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
    const fbTotalViews = insights.facebook.posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
    const totalImpact = Math.max(igTotalViews, fbTotalViews, paidMetrics.views) + (insights.google?.impressions || 0);

    return NextResponse.json({
      success: true,
      title: property.title,
      city: property.city,
      state: property.state,
      totalImpact,
      isBoosted: !!(property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date()) || !!goSession || !!property.instagramMediaId,
      metaSessionStatus,
      apiUnavailable: igMediaIds.length > 0 && !graphApiAvailable,
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS ROUTE ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
