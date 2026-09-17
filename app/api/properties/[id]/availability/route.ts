import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchICalEvents } from "@/lib/ical-parser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = Number(id);
    if (isNaN(propertyId)) {
      return NextResponse.json({ success: false, error: "ID inválido." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        offers: {
          where: {
            status: { in: ["accepted", "ACCEPTED", "ACCEPTED_WAITING_PAYMENT", "RESERVA_CONFIRMADA"] },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Imóvel não encontrado." }, { status: 404 });
    }

    // 1. Local confirmed reservations
    const localBlocks = property.offers
      .filter((o) => o.startDate && o.endDate)
      .map((offer) => ({
        start: offer.startDate!.toISOString().split("T")[0],
        end: offer.endDate!.toISOString().split("T")[0],
        label: "Indisponível",
        source: "local" as const,
      }));

    // 2. Owner custom blocked dates from customRates
    const customRates = (property.customRates || {}) as Record<string, any>;
    const customBlocks: { start: string; end: string; label: string; source: "local" }[] = [];
    Object.entries(customRates).forEach(([dateStr, rate]) => {
      if (rate && typeof rate === "object" && rate.blocked === true) {
        customBlocks.push({
          start: dateStr,
          end: dateStr,
          label: "Fechado pelo proprietário",
          source: "local",
        });
      }
    });

    // 3. iCal external sync blocks
    const feeds = (property.icalFeeds as { name: string; url: string }[]) || [];
    const icalBlocks: { start: string; end: string; label: string; source: "ical" }[] = [];

    if (feeds.length > 0) {
      const results = await Promise.allSettled(
        feeds.map((feed) => fetchICalEvents(feed.url, feed.name))
      );
      for (const result of results) {
        if (result.status === "fulfilled") {
          for (const evt of result.value) {
            icalBlocks.push({
              start: evt.start.toISOString().split("T")[0],
              end: evt.end.toISOString().split("T")[0],
              label: "Reserva Externa",
              source: "ical",
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      propertyTitle: property.title,
      basePrice: Number(property.price || 0),
      minNights: property.minNights || 1,
      customRates,
      blocks: [...localBlocks, ...customBlocks, ...icalBlocks],
    });
  } catch (error: any) {
    console.error("[availability GET] erro:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro interno." },
      { status: 500 }
    );
  }
}
