import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchICalEvents } from "@/lib/ical-parser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
    }

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
            status: { in: ["accepted", "ACCEPTED_WAITING_PAYMENT", "RESERVA_CONFIRMADA", "PENDING_HOST_APPROVAL"] },
          },
          include: { buyer: { select: { name: true } } },
        },
      },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Imóvel não encontrado." }, { status: 404 });
    }

    if (property.ownerId !== Number(session.user.id)) {
      return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
    }

    // 1. Reservas locais aceitas
    const localBlocks = property.offers.map((offer) => ({
      start: offer.startDate ? offer.startDate.toISOString().split("T")[0] : null,
      end: offer.endDate ? offer.endDate.toISOString().split("T")[0] : null,
      label: `Reservado por ${offer.buyer?.name || "Hóspede"}`,
      source: "local" as const,
      guests: (offer as any).guests || null,
    })).filter((b) => b.start && b.end);

    // 2. Bloqueios dos feeds iCal externos
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
              label: evt.summary,
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
      customRates: (property.customRates as Record<string, any>) || {},
      blocks: [...localBlocks, ...icalBlocks],
    });
  } catch (error: any) {
    console.error("[calendario GET] erro:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro interno." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const propertyId = Number(id);
    if (isNaN(propertyId)) {
      return NextResponse.json({ success: false, error: "ID inválido." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Imóvel não encontrado." }, { status: 404 });
    }

    if (property.ownerId !== Number(session.user.id)) {
      return NextResponse.json({ success: false, error: "Acesso negado." }, { status: 403 });
    }

    const body = await req.json();
    const { basePrice, minNights, customRates } = body;

    const dataToUpdate: any = {};

    if (basePrice !== undefined && basePrice !== null) {
      const numBase = Number(basePrice);
      if (!isNaN(numBase) && numBase >= 0) {
        dataToUpdate.price = numBase;
      }
    }

    if (minNights !== undefined && minNights !== null) {
      const numMin = Number(minNights);
      if (!isNaN(numMin) && numMin > 0) {
        dataToUpdate.minNights = numMin;
      }
    }

    if (customRates !== undefined && typeof customRates === "object") {
      dataToUpdate.customRates = customRates;
    }

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      basePrice: Number(updatedProperty.price),
      minNights: updatedProperty.minNights,
      customRates: updatedProperty.customRates,
    });
  } catch (error: any) {
    console.error("[calendario POST] erro:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao salvar alterações." },
      { status: 500 }
    );
  }
}
