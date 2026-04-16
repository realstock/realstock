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
              const baseRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}?fields=like_count,comments_count,updated_at&access_token=${igToken}`);
              const baseData = await baseRes.json();
              
              if (baseData && !baseData.error) {
                  const insRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}/insights?metric=impressions,reach,video_views,plays,shares&access_token=${igToken}`);
                  const insData = await insRes.json();

                  let impressions = 0, reach = 0, shares = 0;
                  if (insData && insData.data) {
                      for (const m of insData.data) {
                          if (m.name === 'impressions' || m.name === 'video_views' || m.name === 'plays') {
                              impressions = m.values[0]?.value || impressions;
                          }
                          if (m.name === 'reach') reach = m.values[0]?.value || 0;
                          if (m.name === 'shares') shares = m.values[0]?.value || 0;
                      }
                  }

                  insights.instagram = {
                      likes: baseData.like_count || 0,
                      comments: baseData.comments_count || 0,
                      views: impressions,
                      reach, 
                      shares,
                      publishedDate: baseData.updated_at || igSessionFallback?.updatedAt
                  };
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
                    const res = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions)&access_token=${pageInfo.access_token}`);
                    const data = await res.json();
                    
                    if (data && !data.error) {
                        let imps = 0;
                        if (data.insights && data.insights.data) {
                            imps = data.insights.data.find((m:any) => m.name === 'post_impressions')?.values[0].value || 0;
                        }
                        insights.facebook = {
                            likes: data.likes?.summary?.total_count || 0,
                            comments: data.comments?.summary?.total_count || 0,
                            shares: data.shares?.count || 0,
                            impressions: imps,
                            publishedDate: fbSession.updatedAt
                        };
                    }
                }
            }
        } catch(e) {}
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
                    cpc: adsData.cpc,
                    budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                    activeDays: goSession.budgetDays
                };
            }
        }
    }

    return NextResponse.json({
      success: true,
      totalImpact: (insights.instagram?.views || 0) + (insights.facebook?.impressions || 0) + (insights.metaAds?.views || 0),
      isBoosted,
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS ROUTE ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
