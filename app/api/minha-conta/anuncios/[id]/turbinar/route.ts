import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { success: false, error: "Não autorizado" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const propertyId = Number(resolvedParams.id);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    let property: any = null;

    if (propertyId === 0) {
      const userProperties = await prisma.property.findMany({
        where: { ownerId: user.id },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
        take: 5
      });

      property = {
        id: 0,
        title: "Portfólio de Imóveis (Todos)",
        state: user.state || "Brasil",
        images: userProperties.flatMap(p => p.images.map(img => ({
          ...img,
          propertyTitle: p.title,
          propertyPrice: p.price?.toString() || "0",
          propertyCity: p.city || "",
          propertyState: p.state || ""
        })))
      };
    } else {
      property = await prisma.property.findFirst({
        where: {
          id: propertyId,
          ownerId: user.id,
        },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!property) {
        return NextResponse.json(
          { success: false, error: "Anúncio não encontrado ou sem permissão" },
          { status: 404 }
        );
      }
    }

    const igSessions = await prisma.instagramPreviewSession.findMany({
        where: {
            listingId: propertyId
        },
        orderBy: { createdAt: "desc" }
    });

    const fbSessions = await prisma.facebookFeedSession.findMany({
        where: {
            listingId: propertyId
        },
        orderBy: { createdAt: "desc" }
    });


    const latestMetaSession = await prisma.metaAdsSession.findFirst({
        where: { listingId: propertyId },
        orderBy: { createdAt: "desc" }
    });

    const service = await prisma.siteService.findUnique({
      where: { slug: "turbinar" },
      include: { fee: true },
    });

    let activeCampaignDetails = null;
    const isBoosted = Boolean(
      (property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date()) ||
      (property.boostedUntil && new Date(property.boostedUntil) > new Date()) ||
      (property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date())
    );

    if (isBoosted) {
      const isGoogle = Boolean(property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date());
      const endDt = new Date(property.metaBoostedUntil || property.googleBoostedUntil || property.boostedUntil);
      const calculatedEndFormatted = endDt.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });

      const budgetVal = latestMetaSession?.budget ? Number(latestMetaSession.budget) : 50;
      const budgetDaysVal = latestMetaSession?.budgetDays || 5;
      const dailyVal = Math.round(budgetVal / budgetDaysVal);

      activeCampaignDetails = {
        campaignName: propertyId === 0 ? "RealStock Boost Portfólio Geral" : `RealStock Boost Propriedade ${propertyId}`,
        adsetName: isGoogle ? `AdSet Google ${property.city || property.state || "Brasil"}` : `AdSet RealStock (${property.city || property.state || "Brasil"})`,
        adName: propertyId === 0 ? "Anúncio Portfólio Geral" : `Anuncio Turbinado Prop ${propertyId}`,
        platform: isGoogle ? "Google Ads (Rede de Pesquisa)" : "Instagram & Facebook (Meta Ads)",
        status: "Ativo",
        adStatus: isGoogle ? "Qualificado para Veiculação" : "Em Análise pela IA da Meta (Aprovação em poucos minutos)",
        targeting: isGoogle 
          ? `${property.city || property.state || "Brasil"} • Pesquisa Google`
          : `Raio Geográfico Meta Ads (${property.city || property.state || "Brasil"}) • 18 a 65+ anos`,
        dailyBudget: dailyVal,
        durationDays: budgetDaysVal,
        totalInvestment: budgetVal,
        endDate: calculatedEndFormatted,
        format: isGoogle ? "Rede de Pesquisa Google" : "Carrossel de Fotos & Reels",
        cta: isGoogle ? "Acessar Site do Imóvel" : "Botão Saiba Mais (Link Direto)",
        targetUrl: `https://www.realstock.com.br/imovel/${propertyId}`
      };
    }

    return NextResponse.json({
      success: true,
      property,
      igSessions,
      fbSessions,
      latestMetaSession,
      activeCampaignDetails,
      service
    });
  } catch (error: any) {
    console.error("GET BOOST DETAILS ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno" },
      { status: 500 }
    );
  }
}
