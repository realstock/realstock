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

    if (!propertyId || Number.isNaN(propertyId)) {
      return NextResponse.json(
        { success: false, error: "Imóvel inválido." },
        { status: 400 }
      );
    }

    if (!offerPrice || Number.isNaN(offerPrice) || offerPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "Valor da proposta inválido." },
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

    const offer = await prisma.offer.create({
      data: {
        propertyId,
        buyerId,
        offerPrice,
        status: "open",
      },
    });

    if (property.owner?.email) {
      try {
        await sendEmail({
          to: property.owner.email,
          subject: `Parabéns, seu anúncio: ${property.title} acaba de receber uma oferta`,
          html: getOfferEmailTemplate(property.title, property.id),
        });

        // Também salva na caixa de entrada interna (banco de dados)
        await prisma.emailMessage.create({
          data: {
            sender: "RealStock <contato@realstock.com.br>",
            recipient: property.owner.email,
            subject: `Parabéns, seu anúncio: ${property.title} acaba de receber uma oferta`,
            htmlBody: getOfferEmailTemplate(property.title, property.id),
            direction: "OUTBOUND",
            status: "UNREAD",
          },
        });
      } catch (emailError) {
        console.error("EMAIL OFFER ERROR:", emailError);
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