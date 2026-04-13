import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const listingId = Number(rawId);

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });
    }

    let itemTitle = "Portfólio Global";
    let isBoosted = false;

    if (listingId > 0) {
      const property = await prisma.property.findUnique({ where: { id: listingId } });
      if (!property || property.ownerId !== user.id) {
         return NextResponse.json({ success: false, error: "Anúncio não encontrado." }, { status: 404 });
      }
      itemTitle = property.title;
      isBoosted = (property.boostedUntil && new Date(property.boostedUntil) > new Date()) || 
                  (property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date()) || 
                  (property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date()) || false;
    } else {
      isBoosted = (user.portfolioBoostedUntil && new Date(user.portfolioBoostedUntil) > new Date()) ||
                  (user.metaPortfolioBoostedUntil && new Date(user.metaPortfolioBoostedUntil) > new Date()) ||
                  (user.googlePortfolioBoostedUntil && new Date(user.googlePortfolioBoostedUntil) > new Date()) || false;
    }

    // Capture sessions
    const igSession = await prisma.instagramPreviewSession.findFirst({
        where: { listingId: listingId, status: "PUBLISHED" },
        orderBy: { createdAt: 'desc' }
    });

    const fbSession = await prisma.facebookFeedSession.findFirst({
        where: { listingId: listingId, status: "PUBLISHED" },
        orderBy: { createdAt: 'desc' }
    });

    const goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: listingId, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    });

    // Removed the mock generator because we are using real data API now

    const insights = {
        instagram: null as any,
        facebook: null as any,
        google: null as any
    };

    if (igSession && igSession.publishedMediaId) {
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
              const baseRes = await fetch(`https://graph.facebook.com/v19.0/${igSession.publishedMediaId}?fields=media_type,like_count,comments_count&access_token=${igToken}`);
              const baseData = await baseRes.json();
              
              if (baseData && !baseData.error) {
                  const likes = baseData.like_count || 0;
                  const comments = baseData.comments_count || 0;
                  
                  // Meta API Update: 'views' unifies impressions, plays, and carousel_album_impressions.
                  const metricNames = "views,reach,shares"; 
                  
                  let impressions = 0;
                  let reach = 0;
                  let shares = 0;
                  
                  const insRes = await fetch(`https://graph.facebook.com/v19.0/${igSession.publishedMediaId}/insights?metric=${metricNames}&access_token=${igToken}`);
                  const insData = await insRes.json();

                  if (insData && insData.data) {
                      for (const m of insData.data) {
                          if (m.name === 'views') impressions = m.values[0]?.value || 0;
                          if (m.name === 'reach') reach = m.values[0]?.value || 0;
                          if (m.name === 'shares') shares = m.values[0]?.value || 0;
                      }
                  }

                  insights.instagram = {
                      likes,
                      comments,
                      views: impressions,
                      reach,
                      shares,
                      publishedDate: igSession.updatedAt
                  };
              } else {
                  console.warn("IG Graph API Base Error:", baseData.error);
              }
            }
        } catch(e) { console.error("Falha ao buscar insights IG", e); }

        // Fallback zeros caso dê erro (impede que fiquem números fakes inflados)
        if (!insights.instagram) {
            insights.instagram = { likes: 0, comments: 0, views: 0, reach: 0, shares: 0, publishedDate: igSession.updatedAt };
        }
    }

    if (fbSession && fbSession.publishedPostId) {
        try {
            const userToken = process.env.INSTAGRAM_ACCESS_TOKEN; // Usado também para solicitar as contas FB
            const pageId = process.env.FACEBOOK_PAGE_ID;

            if (userToken && pageId) {
                const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
                const pageTokenData = await pageTokenRes.json();
                const pageInfo = pageTokenData.data?.find((p: any) => p.id === pageId);

                if (pageInfo && pageInfo.access_token) {
                    const res = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions,post_clicks)&access_token=${pageInfo.access_token}`);
                    const data = await res.json();
                    
                    if (data && !data.error) {
                        const likes = data.likes?.summary?.total_count || 0;
                        const comments = data.comments?.summary?.total_count || 0;
                        const shares = data.shares?.count || 0;
                        
                        let impressions = 0;
                        let clicks = 0;
                        
                        if (data.insights && data.insights.data) {
                            for (const m of data.insights.data) {
                                if (m.name === 'post_impressions' && m.values?.[0]) impressions = m.values[0].value;
                                if (m.name === 'post_clicks' && m.values?.[0]) clicks = m.values[0].value;
                            }
                        }
                    
                        insights.facebook = {
                            likes,
                            comments,
                            impressions,
                            clicks,
                            shares,
                            publishedDate: fbSession.updatedAt
                        };
                    } else {
                        console.warn("FB Graph API Error:", data.error);
                    }
                }
            }
        } catch(e) { console.error("Falha ao buscar insights FB", e); }

        if (!insights.facebook) {
             insights.facebook = { likes: 0, comments: 0, impressions: 0, clicks: 0, shares: 0, publishedDate: fbSession.updatedAt };
        }
    }

    if (goSession && !goSession.campaignId.includes("MOCK")) {
        // True Google Ads Metrics
        const adsData = await getGoogleAdsCampaignInsights(goSession.campaignId);
        const budget = Number(goSession.budget);

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
            // Keep zeros if API fails or campaign is not active yet
            insights.google = {
                clicks: 0,
                impressions: 0,
                ctr: "0.00",
                cpc: "R$ 0,00",
                budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                activeDays: goSession.budgetDays
            };
        }
    } else if (goSession) {
        // Fallback backward compatibility for older mocked rows
        const budget = Number(goSession.budget);
        insights.google = {
            clicks: 0,
            impressions: 0,
            ctr: "0.00",
            cpc: "R$ 0,00",
            budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            activeDays: goSession.budgetDays
        };
    }

    if (!igSession && !fbSession && !goSession) {
        return NextResponse.json({ success: false, error: "Nenhuma campanha ativa encontrada para este anúncio." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      title: itemTitle,
      isBoosted,
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS EXCEPTION:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
