import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const offerId = Number(body.offer_id);

    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json(
        { success: false, error: "offer_id inválido." },
        { status: 400 }
      );
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        property: {
          include: { owner: true },
        },
      },
    });

    if (!offer) {
      return NextResponse.json(
        { success: false, error: "Oferta não encontrada." },
        { status: 404 }
      );
    }

    if (!offer.property?.owner?.identityDocumentUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "É necessário enviar seu Documento de Identidade em PDF no seu cadastro para aceitar reservas.",
          code: "DOCUMENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    if (String(offer.status).toLowerCase() !== "open") {
      return NextResponse.json(
        { success: false, error: "Apenas ofertas em aberto podem ser aceitas." },
        { status: 400 }
      );
    }

    await prisma.offer.update({
      where: { id: offerId },
      data: {
        status: "accepted",
      },
    });

    // Trigger host automatic message for ON_HOST_ACCEPT
    const { triggerAutoMessage } = await import("@/lib/auto-messages");
    await triggerAutoMessage("ON_HOST_ACCEPT", offerId);

    return NextResponse.json({
      success: true,
      message: "Proposta aceita com sucesso.",
    });
  } catch (error: any) {
    console.error("ACEITAR OFERTA ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao aceitar proposta.",
      },
      { status: 500 }
    );
  }
}