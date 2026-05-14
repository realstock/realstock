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
    let paidMetrics = { reach: 0, views: 0, clicks: 0, spend: 0 };
    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const pageToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (pageToken) {
        const adsSessions = await prisma.metaAdsSession.findMany({
            where: { listingId: propertyId },
        });

        // Coletar todos os IDs possíveis de anúncios e campanhas
        const targetIds = new Set<string>();
        if (property.metaAdId) targetIds.add(String(property.metaAdId));
        if (property.metaCampaignId) targetIds.add(String(property.metaCampaignId));
        adsSessions.forEach(s => { if (s.campaignId) targetIds.add(s.campaignId); });

        for (const tId of targetIds) {
            try {
                const adsRes = await fetch(`https://graph.facebook.com/v19.0/${tId}/insights?fields=reach,impressions,inline_link_clicks,spend&date_preset=maximum&access_token=${pageToken}`);
                const adsData = await adsRes.json();
                
                if (adsData?.data?.[0]) {
                    const d = adsData.data[0];
                    const r = parseInt(d.reach || "0");
                    const v = parseInt(d.impressions || "0");
                    const c = parseInt(d.inline_link_clicks || "0");
                    const s = parseFloat(d.spend || "0");
                    
                    // Somar métricas se forem de IDs diferentes (Ads vs Campaigns pode duplicar, então pegamos o maior entre eles se houver vínculo direto)
                    // Mas para garantir que não zeramos, vamos acumular o maior valor encontrado de qualquer fonte
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
    const igSessions = await prisma.instagramPreviewSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    console.log(`[Insights] Found ${igSessions.length} IG sessions for property ${propertyId}`);
    
    const igMediaIds = igSessions.map(s => ({ id: s.publishedMediaId, type: s.postType }));
    if (property.instagramMediaId && !igMediaIds.find(i => i.id === property.instagramMediaId)) {
        igMediaIds.push({ id: property.instagramMediaId, type: 'reels' });
    }

    for (const item of igMediaIds) {
        if (!item.id) continue;

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
                const baseRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}?fields=like_count,comments_count,timestamp,media_type,video_id&access_token=${igToken}`);
                const baseData = await baseRes.json();
                
                if (baseData && !baseData.error) {
                    baseRecord.likes = baseData.like_count || 0;
                    baseRecord.comments = baseData.comments_count || 0;
                    baseRecord.publishedDate = baseData.timestamp || baseRecord.publishedDate;
                    baseRecord.type = baseData.media_type === 'VIDEO' ? 'reels' : (baseData.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'image');

                    let views = 0;
                    let reach = 0;

                    if (baseData.media_type === 'VIDEO' || baseData.video_id) {
                        const vId = baseData.video_id || item.id;
                        const fbVidRes = await fetch(`https://graph.facebook.com/v19.0/${vId}?fields=views,play_count,video_play_count&access_token=${igToken}`);
                        const fbVidData = await fbVidRes.json();
                        if (fbVidData && !fbVidData.error) {
                            views = Math.max(fbVidData.views || 0, fbVidData.play_count || 0, fbVidData.video_play_count || 0);
                        }
                    }

                    try {
                        const insRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}/insights?metric=views,reach&access_token=${igToken}`);
                        const insData = await insRes.json();
                        if (insData?.data) {
                            const vObj = insData.data.find((m: any) => m.name === 'views');
                            if (vObj) views = Math.max(views, vObj.values?.[0]?.value || 0);
                            const rObj = insData.data.find((m: any) => m.name === 'reach');
                            if (rObj) reach = Math.max(reach, rObj.values?.[0]?.value || 0);
                        }
                    } catch(e) {}

                    baseRecord.views = Math.max(views, paidMetrics.views);
                    baseRecord.reach = Math.max(reach, paidMetrics.reach);
                } else {
                    console.warn(`[Insights] IG API error for ${item.id}:`, baseData?.error?.message);
                }
            }
        } catch(e) { console.error("IG ORGANIC ERROR", e); }

        insights.instagram.posts.push(baseRecord);
    }

    // 3. FACEBOOK ORGANIC INSIGHTS
    const fbSessions = await prisma.facebookFeedSession.findMany({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });

    console.log(`[Insights] Found ${fbSessions.length} FB sessions for property ${propertyId}`);

    if (fbSessions.length > 0) {
        const fbToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        for (const fbSession of fbSessions) {
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
                    const res = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=id,shares,comments.summary(total_count),likes.summary(total_count),updated_time,views&access_token=${fbToken}`);
                    const fbData = await res.json();
                    if (fbData && !fbData.error) {
                        baseRecord.likes = fbData.likes?.summary?.total_count || 0;
                        baseRecord.comments = fbData.comments?.summary?.total_count || 0;
                        baseRecord.shares = fbData.shares?.count || 0;
                        baseRecord.views = fbData.views || 0;
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
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS ROUTE ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
