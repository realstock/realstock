import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";

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

    const insights: any = {
        metaAds: null,
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
        igMediaIds.push({ id: property.instagramMediaId, type: 'carousel' });
    }

    const instagramPosts: any[] = [];
    for (const item of igMediaIds) {
        if (!item.id) continue;
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
                const baseRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}?fields=like_count,comments_count,timestamp&access_token=${igToken}`);
                const baseData = await baseRes.json();
                
                if (baseData && !baseData.error) {
                    let postType = item.type;
                    if (baseData.media_type === 'VIDEO') postType = 'reels';
                    else if (baseData.media_type === 'CAROUSEL_ALBUM') postType = 'carousel';

                    let views = 0, reach = 0, shares = 0;
                    try {
                        const insRes = await fetch(`https://graph.facebook.com/v19.0/${item.id}/insights?metric=views,reach,shares,saved&access_token=${igToken}`);
                        const insData = await insRes.json();
                        if (insData && insData.data) {
                            for (const m of insData.data) {
                                const val = m.values?.[0]?.value || 0;
                                if (m.name === 'views') views += val;
                                if (m.name === 'reach') reach = val;
                                if (m.name === 'shares') shares = val;
                            }
                        }
                    } catch(e) { console.error("IG Insights Metric Error:", e); }

                    instagramPosts.push({
                        type: postType,
                        likes: baseData.like_count || 0,
                        comments: baseData.comments_count || 0,
                        views,
                        reach,
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
                        
                        const basicRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count),updated_time&access_token=${pageInfo.access_token}`);
                        const basicData = await basicRes.json();
                        
                        if (basicData && !basicData.error) {
                            let views = 0;
                            try {
                                const insRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_impressions&access_token=${pageInfo.access_token}`);
                                const insData = await insRes.json();
                                if (insData && insData.data && !insData.error) {
                                    views = insData.data.find((m:any) => m.name === 'post_impressions')?.values[0]?.value || 0;
                                } else if (insData.error) {
                                    const vidRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_video_views&access_token=${pageInfo.access_token}`);
                                    const vidData = await vidRes.json();
                                    if (vidData && vidData.data && !vidData.error) {
                                        views = vidData.data.find((m:any) => m.name === 'post_video_views')?.values[0]?.value || 0;
                                    } else if (vidData.error) {
                                        const unqRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_impressions_unique&access_token=${pageInfo.access_token}`);
                                        const unqData = await unqRes.json();
                                        if (unqData && unqData.data && !unqData.error) {
                                            views = unqData.data.find((m:any) => m.name === 'post_impressions_unique')?.values[0]?.value || 0;
                                        }
                                    }
                                }
                            } catch(e) {}

                            facebookPosts.push({
                                type: fbSession.postType || 'carousel',
                                likes: basicData.likes?.summary?.total_count || 0,
                                comments: basicData.comments?.summary?.total_count || 0,
                                shares: basicData.shares?.count || 0,
                                views,
                                publishedDate: basicData.updated_time || fbSession.updatedAt
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
    if (goSession && property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date()) {
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
