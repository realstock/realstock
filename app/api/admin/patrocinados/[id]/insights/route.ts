import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: pubId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const pub = await prisma.adminSponsoredPublication.findUnique({
      where: { id: pubId }
    });

    if (!pub) {
      return NextResponse.json({ success: false, error: "Lote não encontrado." }, { status: 404 });
    }

    // Capture sessions for this specific publisher box
    const igSession = await prisma.instagramPreviewSession.findFirst({
        where: { listingId: -2, status: "PUBLISHED", caption: pubId },
        orderBy: { createdAt: 'desc' }
    });

    const fbSession = await prisma.facebookFeedSession.findFirst({
        where: { listingId: -2, status: "PUBLISHED", caption: pubId },
        orderBy: { createdAt: 'desc' }
    });

    // Google Ads doesn't strictly link to pubId natively in the mock yet, we'll fetch the global one if pub is boosted
    const goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: -2, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    });

    const isBoosted = (pub.googleBoostedUntil && new Date(pub.googleBoostedUntil) > new Date()) || 
                      (pub.metaBoostedUntil && new Date(pub.metaBoostedUntil) > new Date()) || !!igSession || !!fbSession;

    const insights = {
        metaAds: null as any,
        instagram: null as any,
        facebook: null as any,
        google: null as any
    };

    if (igSession && igSession.publishedMediaId) {
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
              const baseRes = await fetch(`https://graph.facebook.com/v19.0/${igSession.publishedMediaId}?fields=like_count,comments_count&access_token=${igToken}`);
              const baseData = await baseRes.json();
              
              if (baseData && !baseData.error) {
                  const insRes = await fetch(`https://graph.facebook.com/v19.0/${igSession.publishedMediaId}/insights?metric=impressions,reach,shares&access_token=${igToken}`);
                  const insData = await insRes.json();

                  let impressions = 0, reach = 0, shares = 0;
                  if (insData && insData.data) {
                      for (const m of insData.data) {
                          if (m.name === 'impressions') impressions = m.values[0]?.value || 0;
                          if (m.name === 'reach') reach = m.values[0]?.value || 0;
                          if (m.name === 'shares') shares = m.values[0]?.value || 0;
                      }
                  }

                  insights.instagram = {
                      likes: baseData.like_count || 0,
                      comments: baseData.comments_count || 0,
                      views: impressions, // Mapeado para o frontend como 'views'
                      reach, 
                      shares,
                      publishedDate: igSession.updatedAt
                  };
              }
            }
        } catch(e) {}
        if (!insights.instagram) insights.instagram = { likes: 0, comments: 0, views: 0, reach: 0, shares: 0, publishedDate: igSession.updatedAt };
    }

    if (fbSession && fbSession.publishedPostId) {
        try {
            const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            const pageId = process.env.FACEBOOK_PAGE_ID;
            if (userToken && pageId) {
                const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
                const pageTokenData = await pageTokenRes.json();
                const pageInfo = pageTokenData.data?.find((p: any) => p.id === pageId);

                if (pageInfo && pageInfo.access_token) {
                    const res = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions)&access_token=${pageInfo.access_token}`);
                    const data = await res.json();
                    
                    if (data && !data.error) {
                        let impressions = 0, clicks = 0;
                        if (data.insights && data.insights.data) {
                            for (const m of data.insights.data) {
                                if (m.name === 'post_impressions' && m.values?.[0]) impressions = m.values[0].value;
                            }
                        }
                    
                        insights.facebook = {
                            likes: data.likes?.summary?.total_count || 0,
                            comments: data.comments?.summary?.total_count || 0,
                            shares: data.shares?.count || 0,
                            impressions, clicks,
                            publishedDate: fbSession.updatedAt
                        };
                    }
                }
            }
        } catch(e) {}
        if (!insights.facebook) insights.facebook = { likes: 0, comments: 0, impressions: 0, clicks: 0, shares: 0, publishedDate: fbSession.updatedAt };
    }

    // 3. META ADS (PAID) INSIGHTS
    if (pub.metaAdId) {
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
                // Fetch Ad Insights
                const adInsRes = await fetch(`https://graph.facebook.com/v19.0/${pub.metaAdId}/insights?fields=impressions,clicks,reach,spend,actions&access_token=${igToken}`);
                const adInsData = await adInsRes.json();
                
                if (adInsData.data && adInsData.data[0]) {
                    const stats = adInsData.data[0];
                    const paidImp = Number(stats.impressions || 0);
                    const paidClicks = Number(stats.clicks || 0);
                    const paidReach = Number(stats.reach || 0);

                    let paidLikes = 0;
                    const actions = stats.actions || [];
                    const actionLike = actions.find((a: any) => a.action_type === "post_reaction" || a.action_type === "like");
                    if (actionLike) paidLikes = parseInt(actionLike.value) || 0;

                    insights.metaAds = {
                        views: paidImp,
                        clicks: paidClicks,
                        reach: paidReach,
                        likes: paidLikes,
                        spend: stats.spend || "0"
                    };

                    // CALCULAR ORGÂNICO REAL: Subtrair o pago do total do Instagram/Facebook
                    if (insights.instagram) {
                        const totalViews = insights.instagram.views;
                        const organicViews = Math.max(0, totalViews - paidImp);
                        insights.instagram.views = organicViews;
                    }
                    if (insights.facebook) {
                        const totalViews = insights.facebook.impressions;
                        const organicViews = Math.max(0, totalViews - paidImp);
                        insights.facebook.impressions = organicViews;
                    }
                }
            }
        } catch(e) {
            console.error("META AD INSIGHTS ERROR", e);
        }
    }

    if (goSession && (pub.googleBoostedUntil && new Date(pub.googleBoostedUntil) > new Date())) {
        const budget = Number(goSession.budget);

        if (goSession.campaignId && !goSession.campaignId.includes("MOCK")) {
            const adsData = await getGoogleAdsCampaignInsights(goSession.campaignId);
            
            if (adsData.success) {
            insights.google = {
                clicks: adsData.clicks,
                impressions: adsData.impressions,
                ctr: adsData.ctr,
                cpc: adsData.cpc,
                budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                activeDays: goSession.budgetDays
            };
            } else {
                insights.google = {
                    clicks: 0, impressions: 0, ctr: "0.00", cpc: "R$ 0,00",
                    budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                    activeDays: goSession.budgetDays
                };
            }
        } else {
            insights.google = {
                clicks: 0, impressions: 0, ctr: "0.00", cpc: "R$ 0,00",
                budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                activeDays: goSession.budgetDays
            };
        }
    }

    let metaSessionStatus = null;
    if (pub.metaBoostedUntil && new Date(pub.metaBoostedUntil) > new Date()) {
         metaSessionStatus = "ACTIVE";
    }

    return NextResponse.json({
      success: true,
      title: pub.name,
      totalImpact: (insights.instagram?.views || 0) + (insights.facebook?.impressions || 0) + (insights.metaAds?.views || 0),
      isBoosted,
      metaSessionStatus,
      insights
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
