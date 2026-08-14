import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getOfferEmailTemplate } from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const buyerId = Number((session.user as any).id);

    if (!buyerId || Number.isNaN(buyerId)) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const propertyId = Number(body.property_id);
    const offerPrice = Number(body.offer_price);
    const startDate = body.start_date ? new Date(body.start_date) : null;
    const endDate = body.end_date ? new Date(body.end_date) : null;
    const guests = body.guests ? Number(body.guests) : 1;

    if (!propertyId || Number.isNaN(propertyId)) {
      return NextResponse.json(
        { success: false, error: "Imóvel inválido." },
        { status: 400 }
      );
    }

    if (offerPrice === undefined || offerPrice === null || Number.isNaN(offerPrice) || offerPrice < 0) {
      return NextResponse.json(
        { success: false, error: "Valor da proposta inválido." },
        { status: 400 }
      );
    }

    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { identityDocumentUrl: true },
    });

    if (!buyer?.identityDocumentUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "É necessário enviar seu Documento de Identidade em PDF no seu cadastro para solicitar reservas.",
          code: "DOCUMENT_REQUIRED",
        },
        { status: 400 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: true,
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Imóvel não encontrado." },
        { status: 404 }
      );
    }

    if (property.ownerId === buyerId) {
      return NextResponse.json(
        { success: false, error: "Você não pode ofertar no próprio imóvel." },
        { status: 400 }
      );
    }

    // Se for Aluguel por Temporada, valida se as datas estão disponíveis e não conflitam
    const isSeasonal = property.listingType === "ALUGUEL_TEMPORADA";
    if (isSeasonal && startDate && endDate) {
      // 1. Verificar ofertas aceitas locais
      const overlappingOffer = await prisma.offer.findFirst({
        where: {
          propertyId,
          status: { in: ["accepted", "ACCEPTED_WAITING_PAYMENT", "RESERVA_CONFIRMADA", "PENDING_HOST_APPROVAL"] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
      });

      if (overlappingOffer) {
        return NextResponse.json(
          { success: false, error: "O período selecionado já está reservado por outro hóspede." },
          { status: 400 }
        );
      }

      // 2. Verificar feeds iCal remotos
      const feeds = (property.icalFeeds as { name: string; url: string }[]) || [];
      if (feeds.length > 0) {
        try {
          const { fetchICalEvents } = require("@/lib/ical-parser");
          const fetchPromises = feeds.map(feed => fetchICalEvents(feed.url, feed.name));
          const results = await Promise.all(fetchPromises);
          for (const eventsList of results) {
            for (const evt of eventsList) {
              const oStart = evt.start;
              const oEnd = evt.end;
              if (startDate < oEnd && endDate > oStart) {
                return NextResponse.json(
                  { success: false, error: `O período selecionado conflita com uma reserva externa: "${evt.summary}"` },
                  { status: 400 }
                );
              }
            }
          }
        } catch (icalErr) {
          console.error("ICal sync check failed during booking:", icalErr);
        }
      }
    }

    // Regra: Apenas 1 proposta ativa por usuário por anúncio.
    // Propostas anteriores do mesmo usuário para este imóvel são marcadas como 'cancelled'
    await prisma.offer.updateMany({
      where: {
        propertyId,
        buyerId,
        status: "open",
      },
      data: {
        status: "cancelled",
      },
    });

    const totalStayPrice = Number(body.total_stay_price || offerPrice);
    const depositPct = property.depositPercentage ? Number(property.depositPercentage) : 20;
    const depositAmount = isSeasonal ? (totalStayPrice * depositPct) / 100 : null;
    const expiresAt = isSeasonal ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    const initialStatus = isSeasonal ? "PENDING_HOST_APPROVAL" : "open";

    const offer = await prisma.offer.create({
      data: {
        propertyId,
        buyerId,
        offerPrice,
        totalStayPrice: isSeasonal ? totalStayPrice : null,
        depositAmount,
        status: initialStatus,
        startDate,
        endDate,
        guests,
        expiresAt,
      },
    });

    // Trigger host automatic message for ON_RESERVATION_REQUEST
    try {
      const { triggerAutoMessage } = await import("@/lib/auto-messages");
      await triggerAutoMessage("ON_RESERVATION_REQUEST", offer.id);
    } catch (autoErr) {
      console.error("Auto message trigger ON_RESERVATION_REQUEST error:", autoErr);
    }

    if (property.owner?.email || property.owner?.phone) {
      try {
        const { sendNotification } = require("@/lib/messenger");
        
        const { getReservationRequestEmailTemplate, getOfferEmailTemplate } = require("@/lib/email-templates");

        let emailHtml = "";
        let subjectText = "";
        let emailSubject = "";
        let messageText = "";
        if (isSeasonal && startDate && endDate) {
          const checkInStr = startDate.toLocaleDateString('pt-BR');
          const checkOutStr = endDate.toLocaleDateString('pt-BR');
          const guestsStr = guests === 1 ? '1 hóspede' : `${guests} hóspedes`;
          subjectText = `Novo Pedido de Reserva: ${property.title}`;
          emailSubject = `Parabéns! Seu anúncio "${property.title}" acaba de receber uma solicitação de reserva`;
          messageText = `Olá ${property.owner.name}! Você acabou de receber uma nova solicitação de reserva para ${guestsStr} no período de ${checkInStr} a ${checkOutStr} (Total: R$ ${totalStayPrice.toLocaleString('pt-BR')}) para o imóvel: ${property.title}.\n\nAcesse seu painel na RealStock em 'Estou Hospedando' para aceitar ou recusar.`;
          emailHtml = getReservationRequestEmailTemplate(
            property.title,
            checkInStr,
            checkOutStr,
            totalStayPrice.toLocaleString('pt-BR'),
            guests || 1
          );
        } else {
          subjectText = `Nova Proposta: ${property.title}`;
          emailSubject = `Parabéns! Seu anúncio "${property.title}" acaba de receber uma oferta`;
          messageText = `Olá ${property.owner.name}! Você acabou de receber uma nova proposta de R$ ${offerPrice.toLocaleString('pt-BR')} para o imóvel: ${property.title}.\n\nAcesse seu painel na RealStock para ver os detalhes.`;
          emailHtml = getOfferEmailTemplate(property.title, property.id);
        }

        await sendNotification({
          toEmail: property.owner.email,
          toPhone: property.owner.phone,
          subject: subjectText,
          text: messageText,
          html: emailHtml,
        });

        // Também salva na caixa de entrada interna (banco de dados)
        if (property.owner.email) {
          await prisma.emailMessage.create({
            data: {
              sender: "RealStock <contato@realstock.com.br>",
              recipient: property.owner.email,
              subject: emailSubject,
              htmlBody: emailHtml,
              direction: "OUTBOUND",
              status: "UNREAD",
            },
          });
        }
      } catch (notifError) {
        console.error("NOTIFICATION OFFER ERROR:", notifError);
      }
    }

    return NextResponse.json({
      success: true,
      offer,
    });
  } catch (error: any) {
    console.error("OFFERS ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao enviar proposta.",
      },
      { status: 500 }
    );
  }
}