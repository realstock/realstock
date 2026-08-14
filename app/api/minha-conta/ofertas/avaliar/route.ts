import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { offerId, rating, perspective } = await req.json();

    const offerIdNum = Number(offerId);
    const ratingNum = Number(rating);

    if (!offerIdNum || isNaN(offerIdNum) || !ratingNum || isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
      return NextResponse.json({ success: false, error: "Parâmetros de avaliação inválidos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });
    }

    const offer = await prisma.offer.findUnique({
      where: { id: offerIdNum },
      include: { property: true },
    });

    if (!offer) {
      return NextResponse.json({ success: false, error: "Reserva não encontrada." }, { status: 404 });
    }

    // Check-in date verification: rating is unlocked on or after check-in date
    if (offer.startDate) {
      const startDate = new Date(offer.startDate);
      const checkInDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const now = new Date();
      const todayDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (todayDay < checkInDay) {
        return NextResponse.json({
          success: false,
          error: `A avaliação só fica habilitada a partir da data de check-in (${startDate.toLocaleDateString("pt-BR")}).`,
        }, { status: 400 });
      }
    }

    // Update rating based on perspective
    if (perspective === "VIAJANDO" || offer.buyerId === user.id) {
      await prisma.offer.update({
        where: { id: offerIdNum },
        data: { guestRating: ratingNum },
      });
    } else if (perspective === "HOSPEDANDO" || offer.property.ownerId === user.id) {
      await prisma.offer.update({
        where: { id: offerIdNum },
        data: { hostRating: ratingNum },
      });
    } else {
      return NextResponse.json({ success: false, error: "Sem permissão para avaliar esta reserva." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: `Avaliação (${ratingNum}/10) registrada com sucesso!`,
      rating: ratingNum,
    });
  } catch (error: any) {
    console.error("ERRO AO AVALIAR RESERVA:", error);
    return NextResponse.json({ success: false, error: error?.message || "Erro ao salvar avaliação." }, { status: 500 });
  }
}
