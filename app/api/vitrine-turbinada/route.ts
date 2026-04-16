import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        let views = 0;
        if (lot.metaAdId && igToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v19.0/${lot.metaAdId}/insights?fields=impressions&access_token=${igToken}`);
                const data = await res.json();
                if (data.data && data.data[0]) {
                    views = Number(data.data[0].impressions || 0);
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
            views,
            image: lotImage,
            link: externalLink
        });
    }

    // Processar Imóveis
    for (const prop of boostedProperties) {
        let views = 0;
        if (prop.metaAdId && igToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v19.0/${prop.metaAdId}/insights?fields=impressions&access_token=${igToken}`);
                const data = await res.json();
                if (data.data && data.data[0]) {
                    views = Number(data.data[0].impressions || 0);
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
            views,
            image: prop.images[0]?.imageUrl || "/placeholder-house.webp",
            link: externalLink
        });
    }

    // Ordenar por mais visualizados
    items.sort((a, b) => b.views - a.views);

    return NextResponse.json({ success: true, items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
