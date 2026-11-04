import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchCachedICalEvents } from "@/lib/ical-parser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      north,
      south,
      east,
      west,
      category,
      propertyType,
      priceMin,
      priceMax,
      country,
      state,
      city,
      bedroomsMin,
      bathroomsMin,
      frontSea,
      pool,
      acceptsFinancing,
      neighborhood,
      listingType,
      checkInDate,
      checkOutDate,
      guestsCount,
    } = body;

    if (
      north === undefined ||
      south === undefined ||
      east === undefined ||
      west === undefined
    ) {
      return NextResponse.json(
        { success: false, error: "Bounds do mapa são obrigatórios." },
        { status: 400 }
      );
    }

    const where: any = {};

    where.listingType = listingType || "ALUGUEL_TEMPORADA";

    // Only restrict by map bounds if the user hasn't explicitly mandated a specific city or neighborhood.
    // This prevents zooming glitches from hiding properties that belong to the selected location!
    if (!city && !neighborhood) {
      where.latitude = {
        gte: Number(south),
        lte: Number(north),
      };
      where.longitude = {
        gte: Number(west),
        lte: Number(east),
      };
    }

    if (category) where.category = category;
    if (propertyType) where.propertyType = propertyType;

    if (country) {
      where.country = { contains: country, mode: "insensitive" };
    }

    if (state) {
      where.state = { contains: state, mode: "insensitive" };
    }

    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    if (neighborhood) {
      where.neighborhood = { contains: neighborhood, mode: "insensitive" };
    }

    if (priceMin || priceMax) {
      where.price = {
        ...(priceMin ? { gte: Number(priceMin) } : {}),
        ...(priceMax ? { lte: Number(priceMax) } : {}),
      };
    }

    if (bedroomsMin) {
      where.bedrooms = { gte: Number(bedroomsMin) };
    }

    if (bathroomsMin) {
      where.bathrooms = { gte: Number(bathroomsMin) };
    }

    if (guestsCount && Number(guestsCount) > 0) {
      where.OR = [
        { maxGuests: { gte: Number(guestsCount) } },
        { maxGuests: null },
      ];
    }

    if (frontSea) where.frontSea = true;
    if (pool) where.pool = true;
    if (acceptsFinancing) where.acceptsFinancing = true;

    const isSeasonal = (listingType || "ALUGUEL_TEMPORADA") === "ALUGUEL_TEMPORADA";

    const properties = await prisma.property.findMany({
      where,
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
      take: 200,
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

        const customRateBlocks = Object.entries((p.customRates || {}) as Record<string, any>)
          .filter(([_, rate]) => rate && typeof rate === "object" && rate.blocked === true)
          .map(([dateStr]) => ({
            start: dateStr,
            end: dateStr,
            source: "customRate",
          }));

        return {
          ...p,
          blockedRanges: [...offerBlocks, ...customRateBlocks, ...icalBlocks],
        };
      })
    );

    let finalProperties = enrichedProperties;

    // Se datas foram selecionadas para aluguel de temporada, filtra e exclui os indisponíveis
    if (isSeasonal && checkInDate) {
      finalProperties = enrichedProperties.filter((property: any) => {
        const [inY, inM, inD] = checkInDate.split("T")[0].split("-").map(Number);
        if (!inY || !inM || !inD) return true;

        const start = new Date(Date.UTC(inY, inM - 1, inD));
        let end: Date;
        let numberOfNights: number;

        if (checkOutDate) {
          const [outY, outM, outD] = checkOutDate.split("T")[0].split("-").map(Number);
          if (!outY || !outM || !outD) return true;
          end = new Date(Date.UTC(outY, outM - 1, outD));
          numberOfNights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (numberOfNights <= 0) return true;
        } else {
          end = new Date(start);
          end.setUTCDate(end.getUTCDate() + 1);
          numberOfNights = 1;
        }

        // 1. Capacidade de hóspedes
        if (guestsCount && Number(guestsCount) > 0 && property.maxGuests && Number(guestsCount) > property.maxGuests) {
          return false;
        }

        // 2. Mínimo de noites (apenas quando data de checkout for explicitamente fornecida)
        const ratesMap = (property.customRates || {}) as Record<string, any>;
        let effectiveMinNights = property.minNights || 1;
        const entryStart = ratesMap[checkInDate];
        if (entryStart && typeof entryStart === "object" && entryStart.minNights !== undefined) {
          effectiveMinNights = Number(entryStart.minNights);
        }

        if (checkOutDate && numberOfNights < effectiveMinNights) {
          return false;
        }

        // 3. Dias bloqueados no customRates
        const cur = new Date(start);
        for (let i = 0; i < numberOfNights; i++) {
          const y = cur.getUTCFullYear();
          const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
          const d = String(cur.getUTCDate()).padStart(2, "0");
          const dateStr = `${y}-${m}-${d}`;
          if (ratesMap[dateStr]?.blocked === true) {
            return false;
          }
          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        // 4. Sobreposição com reservas (offers + iCal)
        for (const range of property.blockedRanges || []) {
          const [bInY, bInM, bInD] = range.start.split("T")[0].split("-").map(Number);
          const [bOutY, bOutM, bOutD] = range.end.split("T")[0].split("-").map(Number);
          if (!bInY || !bInM || !bInD || !bOutY || !bOutM || !bOutD) continue;

          const rStart = new Date(Date.UTC(bInY, bInM - 1, bInD));
          const rEnd = new Date(Date.UTC(bOutY, bOutM - 1, bOutD));
          const rEndEffective = rStart.getTime() === rEnd.getTime()
            ? new Date(rStart.getTime() + 24 * 60 * 60 * 1000)
            : rEnd;

          if (start < rEndEffective && end > rStart) {
            return false;
          }
        }

        return true;
      });
    }

    return NextResponse.json({
      success: true,
      count: finalProperties.length,
      properties: finalProperties,
    });
  } catch (error: any) {
    console.error("SEARCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro na busca de imóveis.",
      },
      { status: 500 }
    );
  }
}