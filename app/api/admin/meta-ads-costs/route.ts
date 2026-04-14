import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return Response.json({ success: false, error: "Acesso Negado." }, { status: 403 });
    }

    // 1. Buscar todas as MetaAdsSessions
    const sessions = await prisma.metaAdsSession.findMany({
      include: {
        property: { select: { id: true, title: true } },
        user: { select: { name: true, email: true } }, // Para Portfolios
      },
      orderBy: { createdAt: "desc" },
    });

    const FACEBOOK_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
    const items = [];

    // 2. Fetch Graph API Insights interativamente
    for (const adSession of sessions) {
      if (!adSession.campaignId || adSession.campaignId.startsWith("MOCK_")) {
        items.push({
          id: adSession.id,
          campaignId: adSession.campaignId,
          title: adSession.property ? `Imóvel #${adSession.property.id}: ${adSession.property.title}` : `Portfólio de ${adSession.user?.name || "Usuário"}`,
          status: adSession.status,
          bRLInvestido: adSession.dailyBudget * adSession.budgetDays,
          metaSpend: 0,
          impressions: 0,
          clicks: 0,
          apiStatus: "MOCK / DEVELOPMENT",
          createdAt: adSession.createdAt
        });
        continue;
      }

      // Buscar API Meta
      let metaSpend = 0;
      let impressions = 0;
      let clicks = 0;
      let apiStatus = adSession.status;

      try {
        if (FACEBOOK_ACCESS_TOKEN) {
          // Insights (últimos 30 dias)
          const insRes = await fetch(
            `https://graph.facebook.com/v19.0/${adSession.campaignId}/insights?fields=spend,impressions,clicks&date_preset=last_30d&access_token=${FACEBOOK_ACCESS_TOKEN}`
          );
          const insJson = await insRes.json();
          if (insJson.data && insJson.data.length > 0) {
            metaSpend = parseFloat(insJson.data[0].spend || "0");
            impressions = parseInt(insJson.data[0].impressions || "0");
            clicks = parseInt(insJson.data[0].clicks || "0");
          }

          // Status Real
          const statRes = await fetch(
            `https://graph.facebook.com/v19.0/${adSession.campaignId}?fields=effective_status&access_token=${FACEBOOK_ACCESS_TOKEN}`
          );
          const statJson = await statRes.json();
          if (statJson.effective_status) {
            apiStatus = statJson.effective_status;
          }
        }
      } catch (e) {
        console.error("Erro ao buscar Meta API para Campaign ID", adSession.campaignId, e);
      }

      items.push({
        id: adSession.id,
        campaignId: adSession.campaignId,
        title: adSession.property ? `Imóvel #${adSession.property.id}: ${adSession.property.title}` : `Portfólio de ${adSession.user?.name || "Usuário"}`,
        status: adSession.status,
        bRLInvestido: adSession.dailyBudget * adSession.budgetDays,
        metaSpend: metaSpend,
        impressions: impressions,
        clicks: clicks,
        apiStatus: apiStatus,
        createdAt: adSession.createdAt
      });
    }

    return Response.json({ success: true, items });
  } catch (error: any) {
    console.error("Erro em /api/admin/meta-ads-costs:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
