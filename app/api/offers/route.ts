import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const propertyId = Number(body.property_id);
    const buyerId = Number(body.buyer_id);
    const offerPrice = Number(body.offer_price);

    if (!propertyId || Number.isNaN(propertyId)) {
      return NextResponse.json(
        { success: false, error: "property_id inválido." },
        { status: 400 }
      );
    }

    if (!buyerId || Number.isNaN(buyerId)) {
      return NextResponse.json(
        { success: false, error: "buyer_id inválido." },
        { status: 400 }
      );
    }

    if (!offerPrice || Number.isNaN(offerPrice) || offerPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "offer_price inválido." },
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
        {
          success: false,
          error: "Você não pode enviar oferta para o próprio anúncio.",
        },
        { status: 400 }
      );
    }

    const existingActiveOffer = await prisma.offer.findFirst({
      where: {
        propertyId,
        buyerId,
        status: {
          in: ["open", "accepted"],
        },
      },
    });

    if (existingActiveOffer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Você já possui uma oferta ativa para este imóvel. Cancele a anterior antes de enviar outra.",
        },
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

    // envio de email ao anunciante
    if (property.owner?.email) {
      try {
        const adminOfferUrl = `${
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        }/minha-conta/anuncios/${property.id}/ofertas`;

        await sendEmail({
          to: property.owner.email,
          subject: "Seu anúncio recebeu uma nova oferta",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
              <h2 style="margin-bottom: 12px;">Parabéns!</h2>

              <p>
                Seu anúncio: <strong>${property.title}</strong> acaba de receber uma oferta.
              </p>

              <p>
                Acesse o site para avaliar.
              </p>

              <p>
                O contato do comprador será liberado após a proposta ser aceita.
              </p>

              <p style="margin-top: 20px;">
                <a
                  href="${adminOfferUrl}"
                  style="display:inline-block;padding:10px 16px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;"
                >
                  Avaliar oferta
                </a>
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
    console.error("CREATE OFFER ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao registrar proposta.",
      },
      { status: 500 }
    );
  }
}