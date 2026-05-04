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

    const fbSession = await prisma.facebookFeedSession.findFirst({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });

    const goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: propertyId, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    });

    const isBoosted = !!(property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date()) || 
                      !!(property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date()) ||
                      !!property.instagramMediaId || !!fbSession;

    const meSession = await prisma.metaAdsSession.findFirst({
        where: { listingId: propertyId },
        orderBy: { createdAt: 'desc' }
    });
    const metaSessionStatus = meSession?.status || null;

    const insights = {
        metaAds: null as any,
        instagram: null as any,
        facebook: null as any,
        google: null as any
    };

    // 2. INSTAGRAM ORGANIC INSIGHTS (Priority: Direct Link)
    const mediaIdToQuery = property.instagramMediaId;
    const igSessionFallback = !mediaIdToQuery ? await prisma.instagramPreviewSession.findFirst({
        where: { listingId: propertyId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    }) : null;

    const finalMediaId = mediaIdToQuery || igSessionFallback?.publishedMediaId;

    if (finalMediaId) {
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
              const baseRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}?fields=like_count,comments_count,timestamp&access_token=${igToken}`);
              const baseData = await baseRes.json();
              
              if (baseData && !baseData.error) {
                  let impressions = 0, reach = 0, shares = 0;
                  try {
                      const insRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}/insights?metric=impressions,reach,video_views,plays,shares&access_token=${igToken}`);
                      const insData = await insRes.json();
                      if (insData && insData.data) {
                          for (const m of insData.data) {
                              const val = m.values?.[0]?.value || 0;
                              if (m.name === 'impressions' || m.name === 'video_views' || m.name === 'plays') {
                                  impressions += val;
                              }
                              if (m.name === 'reach') reach = val;
                              if (m.name === 'shares') shares = val;
                          }
                      }
                  } catch(e) { console.error("IG Insights Metric Error:", e); }

                  insights.instagram = {
                      likes: baseData.like_count || 0,
                      comments: baseData.comments_count || 0,
                      views: impressions,
                      reach, 
                      shares,
                      publishedDate: baseData.timestamp || igSessionFallback?.updatedAt
                  };
              } else {
                  console.error("IG GRAPH API ERROR:", baseData.error);
                  insights.instagram = { likes: 0, comments: 0, views: 0, reach: 0, shares: 0, publishedDate: igSessionFallback?.updatedAt };
              }
            }
        } catch(e) { console.error("IG ORGANIC ERROR", e); }
    }

    // FACEBOOK ORGANIC INSIGHTS
    if (fbSession && fbSession.publishedPostId) {
        try {
            const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            const pageId = process.env.FACEBOOK_PAGE_ID;
            if (userToken && pageId) {
                const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
                const pageTokenData = await pageTokenRes.json();
                const pageInfo = pageTokenData.data?.find((p: any) => p.id === pageId);

                if (pageInfo && pageInfo.access_token) {
                    const basicRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count)&access_token=${pageInfo.access_token}`);
                    const basicData = await basicRes.json();
                    
                    if (basicData && !basicData.error) {
                        let imps = 0;
                        try {
                            const insRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_impressions&access_token=${pageInfo.access_token}`);
                            const insData = await insRes.json();
                            if (insData && insData.data && !insData.error) {
                                imps = insData.data.find((m:any) => m.name === 'post_impressions')?.values[0]?.value || 0;
                            } else if (insData.error) {
                                // Fallback to video views if impressions is not a valid metric for Reels
                                const vidRes = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}/insights?metric=post_video_views&access_token=${pageInfo.access_token}`);
                                const vidData = await vidRes.json();
                                if (vidData && vidData.data && !vidData.error) {
                                    imps = vidData.data.find((m:any) => m.name === 'post_video_views')?.values[0]?.value || 0;
                                }
                            }
                        } catch(e) {}

                        insights.facebook = {
                            likes: basicData.likes?.summary?.total_count || 0,
                            comments: basicData.comments?.summary?.total_count || 0,
                            shares: basicData.shares?.count || 0,
                            impressions: imps,
                            publishedDate: fbSession.updatedAt
                        };
                    } else {
                        console.error("FACEBOOK GRAPH API ERROR:", basicData.error);
                        insights.facebook = { likes: 0, comments: 0, shares: 0, impressions: 0, publishedDate: fbSession.updatedAt };
                    }
                }
            }
        } catch(e) { console.error("FACEBOOK ORGANIC EXCEPTION:", e); }
    }

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

    return NextResponse.json({
      success: true,
      title: property.title,
      city: property.city,
      state: property.state,
      totalImpact: (insights.instagram?.views || 0) + (insights.facebook?.impressions || 0) + (insights.metaAds?.views || 0) + (insights.google?.impressions || 0),
      isBoosted,
      metaSessionStatus,
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS ROUTE ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
