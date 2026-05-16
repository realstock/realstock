import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";
import { getPortfolioListingId } from "@/lib/portfolioId";
import { 
    getFacebookPageAccessToken, 
    getInstagramMediaInsights, 
    getFacebookPostInsights, 
    getMetaAdsInsights 
} from "@/lib/social-insights";

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
    const effectiveListingId = isPortfolio ? getPortfolioListingId(user.id) : propertyId;

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
        metaBoostedUntil: user.portfolioBoostedUntil,
      };
    } else {
      property = await prisma.property.findFirst({
        where: { id: propertyId, ownerId: user.id },
      });
      if (!property) return NextResponse.json({ success: false, error: "Anúncio não encontrado" }, { status: 404 });
    }

    const goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: effectiveListingId, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    }) || (isPortfolio ? await prisma.googleAdsSession.findFirst({ where: { listingId: 0, status: { contains: "ACTIVE" } }, orderBy: { createdAt: 'desc' } }) : null);

    const finalMeSession = await prisma.metaAdsSession.findFirst({
        where: { listingId: effectiveListingId },
        orderBy: { createdAt: 'desc' }
    }) || (isPortfolio ? await prisma.metaAdsSession.findFirst({ where: { listingId: 0 }, orderBy: { createdAt: 'desc' } }) : null);

    const metaSessionStatus = finalMeSession?.status || null;

    // 1. META ADS INSIGHTS
    let paidMetrics = { reach: 0, views: 0, clicks: 0, spend: 0, likes: 0 };
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (igToken) {
        const adsSessions = await prisma.metaAdsSession.findMany({ where: { listingId: effectiveListingId } });
        const targetIds = new Set<string>();
        if (property.metaAdId) targetIds.add(String(property.metaAdId));
        if (property.metaCampaignId) targetIds.add(String(property.metaCampaignId));
        adsSessions.forEach(s => { if (s.campaignId) targetIds.add(s.campaignId); });
        
        paidMetrics = await getMetaAdsInsights(Array.from(targetIds), igToken);
    }

    const insights: any = {
        metaAds: (property.metaAdId || property.metaCampaignId) ? paidMetrics : null,
        instagram: { posts: [] },
        facebook: { posts: [] },
        google: null
    };

    // 2. INSTAGRAM ORGANIC
    let igSessions = await prisma.instagramPreviewSession.findMany({
        where: { listingId: effectiveListingId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    if (igSessions.length === 0 && isPortfolio) {
        igSessions = await prisma.instagramPreviewSession.findMany({ where: { listingId: 0, status: "PUBLISHED" }, orderBy: { createdAt: "desc" } });
    }

    const latestReels = igSessions.find(s => s.postType === 'reels');
    const latestCarousel = igSessions.find(s => s.postType !== 'reels');
    const dedupedIgSessions = [latestReels, latestCarousel].filter(Boolean) as typeof igSessions;

    const igMediaIds = dedupedIgSessions.map(s => ({ id: s.publishedMediaId, type: s.postType }));
    if (property.instagramMediaId && !igMediaIds.find(i => i.id === property.instagramMediaId)) {
        igMediaIds.push({ id: property.instagramMediaId, type: 'reels' });
    }

    let graphApiAvailable = false;
    for (let index = 0; index < igMediaIds.length; index++) {
        const item = igMediaIds[index];
        if (!item.id) continue;

        const isMainBoostedMedia = item.id === property.instagramMediaId || (igMediaIds.length === 1) || (index === 0 && !property.instagramMediaId);
        const matchSession = igSessions.find(s => s.publishedMediaId === item.id);
        
        const baseRecord: any = {
            type: item.type || 'carousel',
            likes: 0, comments: 0, views: 0, reach: 0,
            publishedDate: matchSession?.createdAt || null,
            permalink: (matchSession?.validationReport as any)?.permalink || null,
        };

        if (igToken) {
            const igData = await getInstagramMediaInsights(item.id, igToken);
            if (igData && !igData.error) {
                graphApiAvailable = true;
                baseRecord.likes = Math.max(igData.likes || 0, isMainBoostedMedia ? paidMetrics.likes : 0);
                baseRecord.comments = igData.comments || 0;
                baseRecord.views = Math.max(igData.views || 0, isMainBoostedMedia ? paidMetrics.views : 0);
                baseRecord.reach = Math.max(igData.reach || 0, isMainBoostedMedia ? paidMetrics.reach : 0);
                baseRecord.publishedDate = igData.publishedDate || baseRecord.publishedDate;
                baseRecord.type = igData.type || baseRecord.type;
            } else if (isMainBoostedMedia) {
                baseRecord.views = paidMetrics.views;
                baseRecord.reach = paidMetrics.reach;
                baseRecord.likes = paidMetrics.likes;
            }
        }
        insights.instagram.posts.push(baseRecord);
    }

    // 3. FACEBOOK ORGANIC
    let fbSessions = await prisma.facebookFeedSession.findMany({
        where: { listingId: effectiveListingId, status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
    });
    if (fbSessions.length === 0 && isPortfolio) {
        fbSessions = await prisma.facebookFeedSession.findMany({ where: { listingId: 0, status: "PUBLISHED" }, orderBy: { createdAt: "desc" } });
    }

    const latestFbReels = fbSessions.find(s => s.postType === 'reels');
    const latestFbCarousel = fbSessions.find(s => s.postType !== 'reels');
    const dedupedFbSessions = [latestFbReels, latestFbCarousel].filter(Boolean) as typeof fbSessions;

    if (dedupedFbSessions.length > 0) {
        const pageId = process.env.FACEBOOK_PAGE_ID;
        let fbToken: string | null | undefined = process.env.FACEBOOK_ACCESS_TOKEN;
        if (!fbToken && igToken && pageId) {
            fbToken = await getFacebookPageAccessToken(igToken, pageId);
        }

        for (const fbSession of dedupedFbSessions) {
            if (!fbSession.publishedPostId) continue;
            const baseRecord: any = {
                type: fbSession.postType || 'carousel',
                likes: 0, comments: 0, shares: 0, views: 0,
                publishedDate: fbSession.createdAt,
                permalink: (fbSession.validationReport as any)?.permalink || null,
            };

            if (fbToken) {
                const fbData = await getFacebookPostInsights(fbSession.publishedPostId, fbToken, fbSession.postType || 'carousel');
                if (fbData && !fbData.error) {
                    baseRecord.likes = fbData.likes || 0;
                    baseRecord.comments = fbData.comments || 0;
                    baseRecord.shares = fbData.shares || 0;
                    baseRecord.views = fbData.views || 0;
                    baseRecord.reach = fbData.reach || 0;
                    baseRecord.publishedDate = fbData.publishedDate || baseRecord.publishedDate;
                }
            }
            insights.facebook.posts.push(baseRecord);
        }
    }

    // 4. GOOGLE ADS
    if (goSession?.campaignId && !goSession.campaignId.includes("MOCK")) {
        const adsData = await getGoogleAdsCampaignInsights(goSession.campaignId);
        if (adsData.success) {
            insights.google = {
                clicks: adsData.clicks, impressions: adsData.impressions, ctr: adsData.ctr,
                cpc: Number(adsData.cpc).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                budget: Number(goSession.budget).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                activeDays: goSession.budgetDays
            };
        }
    }

    const igTotalViews = insights.instagram.posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
    const fbTotalViews = insights.facebook.posts.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
    const totalImpact = Math.max(igTotalViews, fbTotalViews, paidMetrics.views) + (insights.google?.impressions || 0);

    return NextResponse.json({
      success: true,
      title: property.title, city: property.city, state: property.state,
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
