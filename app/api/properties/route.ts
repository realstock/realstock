import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCachedICalEvents } from "@/lib/ical-parser";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listingType = searchParams.get("listingType") || "ALUGUEL_TEMPORADA";

    const isSeasonal = listingType === "ALUGUEL_TEMPORADA";

    const properties = await prisma.property.findMany({
      where: {
        listingType: listingType,
      },
      include: {
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
        ...(isSeasonal ? {
          offers: {
            where: {
              status: { in: ["accepted", "ACCEPTED", "ACCEPTED_WAITING_PAYMENT", "RESERVA_CONFIRMADA", "PAGO", "CONCLUIDO", "CHECKIN_LIBERADO"] },
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
              ]
            },
            select: {
              startDate: true,
              endDate: true,
            }
          }
        } : {})
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });

    const enrichedProperties = await Promise.all(
      properties.map(async (p: any) => {
        if (!isSeasonal) return p;

        const icalBlocks: { start: string; end: string; source: string }[] = [];
        const feeds = (p.icalFeeds as { name: string; url: string }[]) || [];
        if (feeds.length > 0) {
          const results = await Promise.allSettled(
            feeds.map((feed) => fetchCachedICalEvents(feed.url, feed.name))
          );
          for (const res of results) {
            if (res.status === "fulfilled") {
              for (const evt of res.value) {
                icalBlocks.push({
                  start: evt.start.toISOString().split("T")[0],
                  end: evt.end.toISOString().split("T")[0],
                  source: "ical",
                });
              }
            }
          }
        }

        const offerBlocks = (p.offers || [])
          .filter((o: any) => o.startDate && o.endDate)
          .map((o: any) => ({
            start: o.startDate.toISOString().split("T")[0],
            end: o.endDate.toISOString().split("T")[0],
            source: "offer",
          }));

        return {
          ...p,
          blockedRanges: [...offerBlocks, ...icalBlocks],
        };
      })
    );

    return NextResponse.json({
      success: true,
      properties: enrichedProperties,
    });
  } catch (error: any) {
    console.error("PROPERTIES GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar imóveis.",
      },
      { status: 500 }
    );
  }
}