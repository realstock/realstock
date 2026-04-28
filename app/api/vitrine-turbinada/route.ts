import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();

    // 1. Buscar Lotes Administrativos Turbinados
    const boostedLots = await prisma.adminSponsoredPublication.findMany({
      where: {
        metaBoostedUntil: { gt: now }
      }
    });

    // 2. Buscar Imóveis de Usuários Turbinados
    const boostedProperties = await prisma.property.findMany({
      where: {
        metaBoostedUntil: { gt: now }
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 }
      }
    });

    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const items = [];

    // Processar Lotes
    for (const lot of boostedLots) {
        let paidViews = 0;
        let organicViews = 0;
        
        // 1. Paid Views (Meta Ads)
        if (lot.metaAdId && igToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v19.0/${lot.metaAdId}/insights?fields=impressions&access_token=${igToken}`);
                const data = await res.json();
                if (data.data && data.data[0]) {
                    paidViews = Number(data.data[0].impressions || 0);
                }
            } catch(e) {}
        }

        // 2. Organic Views (Instagram Content)
        const igMediaId = lot.instagramMediaId;
        if (igMediaId && igToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v19.0/${igMediaId}/insights?metric=impressions&access_token=${igToken}`);
                const data = await res.json();
                if (data.data && data.data[0]) {
                    organicViews = data.data[0].values[0].value || 0;
                }
            } catch(e) {}
        }

        // Buscar imagem real do primeiro imóvel do lote
        let lotImage = "/logo-realstock.jpg";
        const pIds = lot.propertyIds as number[];
        if (pIds && pIds.length > 0) {
            const firstProp = await prisma.property.findUnique({
                where: { id: pIds[0] },
                include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } }
            });
            if (firstProp?.images[0]?.imageUrl) {
                lotImage = firstProp.images[0].imageUrl;
            }
        }

        // Buscar link do post real
        let externalLink = "/";
        const igSess = await prisma.instagramPreviewSession.findFirst({
            where: { listingId: -2, status: "PUBLISHED", caption: lot.id },
            orderBy: { createdAt: "desc" }
        });
        if (igSess?.validationReport) {
            const report = igSess.validationReport as any;
            if (report.permalink) externalLink = report.permalink;
        }

        items.push({
            id: lot.id,
            type: "LOT",
            title: lot.name || "Lote Especial",
            platform: "meta",
            views: paidViews + organicViews,
            paidViews,
            organicViews,
            image: lotImage,
            link: externalLink
        });
    }

    // Processar Imóveis
    for (const prop of boostedProperties) {
        let paidViews = 0;
        let organicViews = 0;

        // 1. Paid Views (Meta Ads)
        if (prop.metaAdId && igToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v19.0/${prop.metaAdId}/insights?fields=impressions&access_token=${igToken}`);
                const data = await res.json();
                if (data.data && data.data[0]) {
                    paidViews = Number(data.data[0].impressions || 0);
                }
            } catch(e) {}
        }

        // 2. Organic Views (Instagram Content)
        const igMediaId = prop.instagramMediaId;
        if (igMediaId && igToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v19.0/${igMediaId}/insights?metric=impressions&access_token=${igToken}`);
                const data = await res.json();
                if (data.data && data.data[0]) {
                    organicViews = data.data[0].values[0].value || 0;
                }
            } catch(e) {}
        }

        let externalLink = `/imovel/${prop.id}`;
        const igSess = await prisma.instagramPreviewSession.findFirst({
            where: { listingId: prop.id, status: "PUBLISHED" },
            orderBy: { createdAt: "desc" }
        });
        if (igSess?.validationReport) {
            const report = igSess.validationReport as any;
            if (report.permalink) externalLink = report.permalink;
        }

        items.push({
            id: prop.id,
            type: "PROPERTY",
            title: prop.title,
            platform: "meta",
            views: paidViews + organicViews,
            paidViews,
            organicViews,
            image: prop.images[0]?.imageUrl || "/placeholder-house.webp",
            link: externalLink
        });
    }

    // Processar Google Lots
    const googleBoostedLots = await prisma.adminSponsoredPublication.findMany({
      where: { googleBoostedUntil: { gt: now } }
    });

    for (const lot of googleBoostedLots) {
        let paidViews = 0;
        const session = await prisma.googleAdsSession.findFirst({
            where: { listingId: -2, status: { in: ["ACTIVE", "ACTIVE_FALLBACK"] } },
            orderBy: { createdAt: "desc" }
        });
        if (session && session.campaignId && !session.campaignId.includes("MOCK")) {
            const insights = await getGoogleAdsCampaignInsights(session.campaignId);
            if (insights.success) paidViews = insights.impressions;
        }
        
        let lotImage = "/logo-realstock.jpg";
        const pIds = lot.propertyIds as number[];
        if (pIds && pIds.length > 0) {
            const firstProp = await prisma.property.findUnique({
                where: { id: pIds[0] },
                include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } }
            });
            if (firstProp?.images[0]?.imageUrl) lotImage = firstProp.images[0].imageUrl;
        }

        items.push({
            id: lot.id + "_g",
            type: "LOT",
            title: lot.name || "Lote Especial",
            platform: "google",
            views: paidViews,
            paidViews,
            organicViews: 0,
            image: lotImage,
            link: "/"
        });
    }

    // Processar Google Properties
    const googleBoostedProperties = await prisma.property.findMany({
      where: { googleBoostedUntil: { gt: now } },
      include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } }
    });

    for (const prop of googleBoostedProperties) {
        let paidViews = 0;
        const session = await prisma.googleAdsSession.findFirst({
            where: { listingId: prop.id, status: { in: ["ACTIVE", "ACTIVE_FALLBACK"] } },
            orderBy: { createdAt: "desc" }
        });
        if (session && session.campaignId && !session.campaignId.includes("MOCK")) {
            const insights = await getGoogleAdsCampaignInsights(session.campaignId);
            if (insights.success) paidViews = insights.impressions;
        }

        items.push({
            id: prop.id + "_g",
            type: "PROPERTY",
            platform: "google",
            title: prop.title,
            views: paidViews,
            paidViews,
            organicViews: 0,
            image: prop.images[0]?.imageUrl || "/placeholder-house.webp",
            link: `/imovel/${prop.id}`
        });
    }

    // Ordenar por mais visualizados
    items.sort((a, b) => b.views - a.views);

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
