import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

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
          html: `
            <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
              <h2>Nova oferta recebida</h2>
              <p>
                Parabéns, seu anúncio <strong>${property.title}</strong> acaba de receber uma oferta.
              </p>
              <p>
                Acesse o site para avaliar. O contato do comprador será liberado após a proposta ser aceita.
              </p>
            </div>
          `,
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