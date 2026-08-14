import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido." },
        { status: 401 }
      );
    }

    const guestOffers = await prisma.offer.findMany({
      where: {
        buyerId: userId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        property: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const hostOffers = await prisma.offer.findMany({
      where: {
        property: {
          ownerId: userId,
        },
      },
      include: {
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        property: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const userConversations = await prisma.conversation.findMany({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      select: {
        id: true,
        propertyId: true,
        buyerId: true,
        sellerId: true,
      },
    });

    const getConversationId = (propertyId: number, buyerId: number, ownerId: number) => {
      const found = userConversations.find(
        (c) => c.propertyId === propertyId && c.buyerId === buyerId && c.sellerId === ownerId
      );
      return found ? found.id : null;
    };

    const mappedGuestOffers = guestOffers.map((o) => ({
      ...o,
      conversationId: getConversationId(o.propertyId, o.buyerId, o.property.ownerId),
    }));

    const mappedHostOffers = hostOffers.map((o) => ({
      ...o,
      conversationId: getConversationId(o.propertyId, o.buyerId, o.property.ownerId),
    }));

    const userPropertiesCount = await prisma.property.count({
      where: { ownerId: userId },
    });

    return NextResponse.json({
      success: true,
      userPropertiesCount,
      hasProperties: userPropertiesCount > 0,
      guestOffers: mappedGuestOffers,
      hostOffers: mappedHostOffers,
      offers: mappedGuestOffers,
    });
  } catch (error: any) {
    console.error("MINHA CONTA OFERTAS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao buscar ofertas.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = String(body.action || "").trim();
    const offerId = Number(body.offer_id);

    if (!offerId || Number.isNaN(offerId)) {
      return NextResponse.json(
        { success: false, error: "offer_id inválido." },
        { status: 400 }
      );
    }

    if (action === "upload_pix") {
      const pixReceiptUrl = String(body.pix_receipt_url || "").trim();
      const skipConfirm = body.skip_confirm === true;

      if (!pixReceiptUrl) {
        return NextResponse.json(
          { success: false, error: "URL do comprovante Pix é obrigatória." },
          { status: 400 }
        );
      }

      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
      });

      if (!offer || offer.buyerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Pedido de reserva não encontrado." },
          { status: 404 }
        );
      }

      const previousValidation = (offer.pixValidation as any) || {};
      const previousUrls: string[] = Array.isArray(previousValidation.receiptUrls)
        ? previousValidation.receiptUrls.filter((u: any) => typeof u === "string" && u.trim().length > 0)
        : offer.pixReceiptUrl
        ? [offer.pixReceiptUrl]
        : [];
      const updatedReceiptUrls = Array.from(new Set([...previousUrls, pixReceiptUrl]));

      // If skip_confirm, just save the URL; AI validation will advance the status.
      // Otherwise (legacy), mark as confirmed immediately.
      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          pixReceiptUrl,
          pixValidation: {
            ...previousValidation,
            receiptUrls: updatedReceiptUrls,
          },
          ...(skipConfirm ? {} : { status: "RESERVA_CONFIRMADA" }),
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
        message: skipConfirm
          ? "Comprovante salvo. Iniciando verificação automática..."
          : "Comprovante enviado! Sua reserva está confirmada.",
      });
    }

    if (action === "reject") {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { property: true },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Pedido não encontrado." },
          { status: 404 }
        );
      }

      if (offer.property.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para recusar esta reserva." },
          { status: 403 }
        );
      }

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "REJECTED",
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
      });
    }

    if (action === "manual_confirm_pix") {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { property: true },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Pedido de reserva não encontrado." },
          { status: 404 }
        );
      }

      if (offer.property?.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Apenas o anfitrião pode aprovar o comprovante manualmente." },
          { status: 403 }
        );
      }

      const currentValidation = (offer.pixValidation as any) || {};
      const updatedValidation = {
        ...currentValidation,
        allPassed: true,
        manuallyApprovedByHost: true,
        manuallyApprovedAt: new Date().toISOString(),
      };

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "RESERVA_CONFIRMADA",
          pixValidation: updatedValidation as any,
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
        message: "Reserva aprovada manualmente pelo anfitrião com sucesso!",
      });
    }

    if (action === "accept") {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: {
          property: true,
        },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Oferta não encontrada." },
          { status: 404 }
        );
      }

      if (offer.property.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para aceitar esta oferta." },
          { status: 403 }
        );
      }

      const hostUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { identityDocumentUrl: true },
      });

      if (!hostUser?.identityDocumentUrl) {
        return NextResponse.json(
          {
            success: false,
            error: "É necessário enviar seu Documento de Identidade em PDF no seu cadastro para aceitar propostas de compra ou reservas.",
            code: "DOCUMENT_REQUIRED",
          },
          { status: 400 }
        );
      }

      if (String(offer.status).toLowerCase() !== "open") {
        return NextResponse.json(
          { success: false, error: "Apenas ofertas abertas podem ser aceitas." },
          { status: 400 }
        );
      }

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "accepted",
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
      });
    }

    if (action === "cancel") {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { property: true },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Oferta não encontrada." },
          { status: 404 }
        );
      }

      const isBuyer = offer.buyerId === userId;
      const isHost = offer.property?.ownerId === userId;

      if (!isBuyer && !isHost) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para cancelar esta oferta." },
          { status: 403 }
        );
      }

      const isAlreadyEnded = offer.status === "cancelled" || offer.status === "rejected";
      if (isAlreadyEnded) {
        return NextResponse.json({
          success: true,
          offer,
        });
      }

      const isFullyConfirmed =
        offer.status === "RESERVA_CONFIRMADA" ||
        (offer.pixValidation as any)?.allPassed === true;

      if (isFullyConfirmed) {
        return NextResponse.json(
          { success: false, error: "Não é possível cancelar uma reserva com sinal totalmente pago e verificado." },
          { status: 400 }
        );
      }

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "cancelled",
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
      });
    }

    if (action === "upload_remaining_balance_pix") {
      const { remainingBalanceReceiptUrl, skipConfirm } = body;

      if (!remainingBalanceReceiptUrl) {
        return NextResponse.json(
          { success: false, error: "URL do comprovante não informada." },
          { status: 400 }
        );
      }

      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Reserva não encontrada." },
          { status: 404 }
        );
      }

      const previousValidation = (offer.remainingBalanceValidation as any) || {};
      const previousUrls: string[] = Array.isArray(previousValidation.receiptUrls)
        ? previousValidation.receiptUrls.filter((u: any) => typeof u === "string" && u.trim().length > 0)
        : offer.remainingBalanceReceiptUrl
        ? [offer.remainingBalanceReceiptUrl]
        : [];
      const updatedReceiptUrls = Array.from(new Set([...previousUrls, remainingBalanceReceiptUrl]));

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          remainingBalanceReceiptUrl,
          remainingBalanceValidation: {
            ...previousValidation,
            receiptUrls: updatedReceiptUrls,
          },
          ...(skipConfirm ? {} : { status: "CHECKIN_LIBERADO", checkInReleasedAt: new Date() }),
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
        message: skipConfirm
          ? "Comprovante do saldo salvo. Iniciando verificação automática..."
          : "Comprovante do saldo enviado! Check-in LIBERADO 🎉",
      });
    }

    if (action === "manual_release_checkin") {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { property: true },
      });

      if (!offer) {
        return NextResponse.json(
          { success: false, error: "Pedido de reserva não encontrado." },
          { status: 404 }
        );
      }

      if (offer.property?.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Apenas o anfitrião pode liberar o check-in manualmente." },
          { status: 403 }
        );
      }

      const updatedOffer = await prisma.offer.update({
        where: { id: offerId },
        data: {
          status: "CHECKIN_LIBERADO",
          checkInReleasedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        offer: updatedOffer,
        message: "Check-in liberado manualmente pelo anfitrião com sucesso! 🎉",
      });
    }

    if (action === "update_checkin_instructions") {
      const { propertyId, checkInInstructions, checkInTime, checkOutTime } = body;

      if (!propertyId) {
        return NextResponse.json(
          { success: false, error: "Imóvel não especificado." },
          { status: 400 }
        );
      }

      const property = await prisma.property.findUnique({
        where: { id: Number(propertyId) },
      });

      if (!property || property.ownerId !== userId) {
        return NextResponse.json(
          { success: false, error: "Sem permissão para alterar as instruções deste imóvel." },
          { status: 403 }
        );
      }

      const updatedProperty = await prisma.property.update({
        where: { id: Number(propertyId) },
        data: {
          checkInInstructions: checkInInstructions || null,
          checkInTime: checkInTime || "14:00",
          checkOutTime: checkOutTime || "12:00",
        },
      });

      return NextResponse.json({
        success: true,
        property: updatedProperty,
        message: "Instruções de Check-in salvas com sucesso!",
      });
    }
  } catch (error: any) {
    console.error("MINHA CONTA OFERTAS POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao processar oferta.",
      },
      { status: 500 }
    );
  }
}