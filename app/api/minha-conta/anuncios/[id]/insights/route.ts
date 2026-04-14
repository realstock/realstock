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
                    const res = await fetch(`https://graph.facebook.com/v19.0/${fbSession.publishedPostId}?fields=shares,comments.summary(total_count),likes.summary(total_count),insights.metric(post_impressions)&access_token=${pageInfo.access_token}`);
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

    if (goSession && goSession.campaignId && !goSession.campaignId.includes("MOCK")) {
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

    const metaAdsSession = await prisma.metaAdsSession.findFirst({
        where: { listingId: listingId },
        orderBy: { createdAt: 'desc' }
    });

    let metaSessionStatus = null;
    
    // Verificação Dinâmica e Destravamento do Relógio Meta
    if (metaAdsSession && metaAdsSession.status === "IN_PROCESS" && metaAdsSession.campaignId && !metaAdsSession.campaignId.includes("MOCK")) {
        const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        if (igToken) {
             const campRes = await fetch(`https://graph.facebook.com/v19.0/${metaAdsSession.campaignId}?fields=effective_status&access_token=${igToken}`);
             const campData = await campRes.json();
             
             if (campData && campData.effective_status) {
                 if (campData.effective_status === "ACTIVE") {
                     metaSessionStatus = "ACTIVE";
                     // Campanha ficou ativa! Destravar relógio de N dias contando a partir de HOJE!
                     await prisma.metaAdsSession.update({
                         where: { id: metaAdsSession.id },
                         data: { status: "ACTIVE" }
                     });
                     
                     const newBoostedEnd = new Date();
                     newBoostedEnd.setDate(newBoostedEnd.getDate() + metaAdsSession.budgetDays);

                     if (listingId === 0) {
                         await prisma.user.update({
                             where: { id: user.id },
                             data: { metaPortfolioBoostedUntil: newBoostedEnd }
                         });
                     } else {
                         await prisma.property.update({
                             where: { id: listingId },
                             data: { metaBoostedUntil: newBoostedEnd }
                         });
                     }
                 } else if (campData.effective_status === "DISAPPROVED" || campData.effective_status === "REJECTED") {
                     metaSessionStatus = "REJECTED";
                     await prisma.metaAdsSession.update({
                         where: { id: metaAdsSession.id },
                         data: { status: "REJECTED" }
                     });
                 } else {
                     metaSessionStatus = "IN_PROCESS";
                 }
             } else {
                 metaSessionStatus = "IN_PROCESS";
             }
        }
    } else if (metaAdsSession) {
        metaSessionStatus = metaAdsSession.status;
    } else {
        // Fallback for campaigns created before MetaAdsSession migration
        if (isBoosted) {
             metaSessionStatus = listingId === 12 ? "ACTIVE" : "IN_PROCESS";
        }
    }

    // AGREGADOR DE INSIGHTS PAGOS: Buscar a real performance da Campanha Paga no Meta
    if (metaAdsSession && metaAdsSession.campaignId && !metaAdsSession.campaignId.includes("MOCK")) {
        try {
            const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
            if (igToken) {
                const adsRes = await fetch(`https://graph.facebook.com/v19.0/${metaAdsSession.campaignId}/insights?fields=impressions,clicks,reach,spend&access_token=${igToken}`);
                const adsData = await adsRes.json();
                if (adsData && adsData.data && adsData.data.length > 0) {
                    const paidImp = Number(adsData.data[0].impressions) || 0;
                    const paidClicks = Number(adsData.data[0].clicks) || 0;
                    const paidReach = Number(adsData.data[0].reach) || 0;
                    
                    if (insights.instagram) {
                         insights.instagram.views = (insights.instagram.views || 0) + paidImp;
                         insights.instagram.reach = (insights.instagram.reach || 0) + paidReach;
                    } 
                    if (insights.facebook) {
                         insights.facebook.impressions = (insights.facebook.impressions || 0) + paidImp;
                         insights.facebook.clicks = (insights.facebook.clicks || 0) + paidClicks;
                    }
                }
            }
        } catch(e) { console.error("Falha ao puxar Paid Ads Insights", e); }
    }

    if (!igSession && !fbSession && !goSession && !metaAdsSession && !isBoosted) {
        return NextResponse.json({ success: false, error: "Nenhuma campanha ativa encontrada para este anúncio." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      title: itemTitle,
      isBoosted,
      metaSessionStatus,
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS EXCEPTION:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
