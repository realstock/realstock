import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const listingId = Number(rawId);

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });
    }

    let itemTitle = "Portfólio Global";
    let isBoosted = false;

    if (listingId > 0) {
      const property = await prisma.property.findUnique({ where: { id: listingId } });
      if (!property || property.ownerId !== user.id) {
         return NextResponse.json({ success: false, error: "Anúncio não encontrado." }, { status: 404 });
      }
      itemTitle = property.title;
      isBoosted = (property.boostedUntil && new Date(property.boostedUntil) > new Date()) || 
                  (property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date()) || 
                  (property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date()) || false;
    } else {
      isBoosted = (user.portfolioBoostedUntil && new Date(user.portfolioBoostedUntil) > new Date()) ||
                  (user.metaPortfolioBoostedUntil && new Date(user.metaPortfolioBoostedUntil) > new Date()) ||
                  (user.googlePortfolioBoostedUntil && new Date(user.googlePortfolioBoostedUntil) > new Date()) || false;
    }

    // Capture sessions
    const igSession = await prisma.instagramPreviewSession.findFirst({
        where: { listingId: listingId, status: "PUBLISHED" },
        orderBy: { createdAt: 'desc' }
    });

    const fbSession = await prisma.facebookFeedSession.findFirst({
        where: { listingId: listingId, status: "PUBLISHED" },
        orderBy: { createdAt: 'desc' }
    });

    const goSession = await prisma.googleAdsSession.findFirst({
        where: { listingId: listingId, status: { contains: "ACTIVE" } },
        orderBy: { createdAt: 'desc' }
    });

    // Deterministic Mock Generator based on listingId
    const seed = listingId + (user.id * 10);
    const mockMultiplier = isBoosted ? 8 : 1; 

    const generateMock = (base: number, randBase: number) => {
        return Math.floor(base * mockMultiplier + ((seed * randBase) % (base / 2)));
    };

    const insights = {
        instagram: null as any,
        facebook: null as any,
        google: null as any
    };

    if (igSession) {
        // Pseudo-real Graph API mapping
        insights.instagram = {
            likes: generateMock(250, 13),
            comments: generateMock(15, 7),
            views: generateMock(4000, 31),
            reach: generateMock(3500, 19),
            shares: generateMock(45, 11),
            publishedDate: igSession.updatedAt
        };
    }

    if (fbSession) {
        insights.facebook = {
            likes: generateMock(320, 17),
            comments: generateMock(28, 5),
            impressions: generateMock(7000, 43),
            clicks: generateMock(120, 23),
            shares: generateMock(80, 29),
            publishedDate: fbSession.updatedAt
        };
    }

    if (goSession) {
        // Google Ads specific metrics (Traffic/CPC based)
        const budget = Number(goSession.budget);
        const clicks = Math.floor(budget * 0.8 * generateMock(10, 3) * mockMultiplier);
        const impressions = clicks * 14;
        
        insights.google = {
            clicks: clicks,
            impressions: impressions,
            ctr: ((clicks / (impressions || 1)) * 100).toFixed(2),
            cpc: (budget / (clicks || 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            budget: budget.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
            activeDays: goSession.budgetDays
        };
    }

    if (!igSession && !fbSession && !goSession) {
        return NextResponse.json({ success: false, error: "Nenhuma campanha ativa encontrada para este anúncio." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      title: itemTitle,
      isBoosted,
      insights
    });

  } catch (error: any) {
    console.error("INSIGHTS EXCEPTION:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}
