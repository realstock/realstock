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
        items.push({
            id: lot.id,
            type: "LOT",
            title: lot.name || "Lote Especial",
            views,
            image: "/placeholder-house.webp", // Lotes costumam ser grupos, podemos usar placeholder ou a primeira do primeiro imóvel
            link: `/admin/patrocinados/${lot.id}/insights` // Link público ou interno? Por enquanto, apenas dados
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
        items.push({
            id: prop.id,
            type: "PROPERTY",
            title: prop.title,
            views,
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
