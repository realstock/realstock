import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function generateIcalResponse(propertyId: number, isHead = false) {
  if (!propertyId || Number.isNaN(propertyId)) {
    return new NextResponse("ID de imóvel inválido", { status: 400 });
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      offers: {
        where: {
          status: { in: ["accepted", "confirmed"] },
          startDate: { not: null },
          endDate: { not: null },
        },
      },
    },
  });

  if (!property) {
    return new NextResponse("Imóvel não encontrado", { status: 404 });
  }

  const nowUtc = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const propertyTitleClean = (property.title || `Imovel ${propertyId}`).replace(/[^\w\s-]/gi, "");

  const events: string[] = [];

  // 1. Export Accepted / Confirmed Reservations
  for (const offer of property.offers) {
    if (!offer.startDate || !offer.endDate) continue;

    const startDateObj = new Date(offer.startDate);
    const endDateObj = new Date(offer.endDate);

    const dtStart = startDateObj.toISOString().split("T")[0].replace(/-/g, "");
    const dtEnd = endDateObj.toISOString().split("T")[0].replace(/-/g, "");

    events.push([
      "BEGIN:VEVENT",
      `UID:offer-${offer.id}@realstock.com.br`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:Not available - RealStock #${offer.id}`,
      "DESCRIPTION:Reserved via RealStock",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    ].join("\r\n"));
  }

  // 2. Export Owner-blocked dates from customRates JSON
  const customRates = (property.customRates as Record<string, any>) || {};
  const blockedDates = Object.entries(customRates)
    .filter(([_, data]) => data && data.blocked === true)
    .map(([dateStr]) => dateStr)
    .sort();

  // Group consecutive blocked dates into single events
  let currentStart: string | null = null;
  let currentEndDate: Date | null = null;

  for (let i = 0; i < blockedDates.length; i++) {
    const dateStr = blockedDates[i];
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));

    if (!currentStart) {
      currentStart = dateStr;
      currentEndDate = dateObj;
    } else if (currentEndDate) {
      const nextDayExpected = new Date(currentEndDate);
      nextDayExpected.setUTCDate(nextDayExpected.getUTCDate() + 1);

      if (dateObj.getTime() === nextDayExpected.getTime()) {
        currentEndDate = dateObj;
      } else {
        const dtStart = currentStart.replace(/-/g, "");
        const dtEndObj = new Date(currentEndDate);
        dtEndObj.setUTCDate(dtEndObj.getUTCDate() + 1);
        const dtEnd = dtEndObj.toISOString().split("T")[0].replace(/-/g, "");

        events.push([
          "BEGIN:VEVENT",
          `UID:block-${currentStart}-${propertyId}@realstock.com.br`,
          `DTSTAMP:${nowUtc}`,
          `DTSTART;VALUE=DATE:${dtStart}`,
          `DTEND;VALUE=DATE:${dtEnd}`,
          "SUMMARY:Not available - Blocked",
          "DESCRIPTION:Blocked by host via RealStock",
          "STATUS:CONFIRMED",
          "END:VEVENT"
        ].join("\r\n"));

        currentStart = dateStr;
        currentEndDate = dateObj;
      }
    }
  }

  if (currentStart && currentEndDate) {
    const dtStart = currentStart.replace(/-/g, "");
    const dtEndObj = new Date(currentEndDate);
    dtEndObj.setUTCDate(dtEndObj.getUTCDate() + 1);
    const dtEnd = dtEndObj.toISOString().split("T")[0].replace(/-/g, "");

    events.push([
      "BEGIN:VEVENT",
      `UID:block-${currentStart}-${propertyId}@realstock.com.br`,
      `DTSTAMP:${nowUtc}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      "SUMMARY:Not available - Blocked",
      "DESCRIPTION:Blocked by host via RealStock",
      "STATUS:CONFIRMED",
      "END:VEVENT"
    ].join("\r\n"));
  }

  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RealStock//NONSGML Calendar 1.0//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:RealStock ${propertyTitleClean}`,
    ...events,
    "END:VCALENDAR"
  ];

  const icsContent = icsLines.join("\r\n") + "\r\n";

  if (isHead) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Length": String(Buffer.byteLength(icsContent)),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="calendar.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await generateIcalResponse(Number(id), false);
  } catch (error: any) {
    console.error("ERRO /api/properties/[id]/ical:", error);
    return new NextResponse("Erro ao gerar arquivo iCal", { status: 500 });
  }
}

export async function HEAD(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return await generateIcalResponse(Number(id), true);
  } catch (error: any) {
    return new NextResponse(null, { status: 500 });
  }
}
