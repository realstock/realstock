import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAdsCampaignInsights } from "@/lib/googleAds";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== "ADMIN") {
      return Response.json({ success: false, error: "Acesso Negado." }, { status: 403 });
    }

    // 1. Buscar todas as GoogleAdsSessions
    const sessions = await prisma.googleAdsSession.findMany({
      orderBy: { createdAt: "desc" },
    });

    const items = [];

    // 2. Fetch Google Ads SDK Interativamente
    for (const adSession of sessions) {
      let title = `Propriedade ID #${adSession.listingId}`;
      if (adSession.listingId) {
         try {
             const prop = await prisma.property.findUnique({ where: { id: adSession.listingId }});
             if (prop) title = `Imóvel #${prop.id}: ${prop.title}`;
         } catch(e) {}
      }

      if (!adSession.campaignId || adSession.campaignId.startsWith("MOCK_")) {
        items.push({
          id: adSession.id,
          campaignId: adSession.campaignId || "MOCK_DEVELOPMENT",
          title: title,
          status: adSession.status,
          bRLInvestido: Number(adSession.budget) * adSession.budgetDays,
          googleSpend: 0,
          impressions: 0,
          clicks: 0,
          ctr: "0.00",
          cpc: 0,
          apiStatus: "MOCK / PAUSED",
          createdAt: adSession.createdAt
        });
        continue;
      }

      // Buscar API Google
      let googleSpend = 0;
      let impressions = 0;
      let clicks = 0;
      let ctr = "0.00";
      let cpc = 0;
      let apiStatus = adSession.status;

      try {
        const insights = await getGoogleAdsCampaignInsights(adSession.campaignId);
        if (insights.success) {
           googleSpend = insights.cost || 0;
           impressions = insights.impressions || 0;
           clicks = insights.clicks || 0;
           ctr = insights.ctr || "0.00";
           cpc = insights.cpc || 0;
           if (typeof insights.status === "number") {
             // Basic ENUM mapping for status if needed, 2 is ENABLED, 3 is PAUSED
             if (insights.status === 2) apiStatus = "ENABLED";
             else if (insights.status === 3) apiStatus = "PAUSED";
             else apiStatus = `STATUS_${insights.status}`;
           } else if (insights.status) {
             apiStatus = insights.status as string;
           }
        }
      } catch (e) {
        console.error("Erro ao buscar Google API para Campaign ID", adSession.campaignId, e);
      }

      items.push({
        id: adSession.id,
        campaignId: adSession.campaignId,
        title: title,
        status: adSession.status,
        bRLInvestido: Number(adSession.budget) * adSession.budgetDays,
        googleSpend: googleSpend,
        impressions: impressions,
        clicks: clicks,
        ctr: ctr,
        cpc: cpc,
        apiStatus: apiStatus,
        createdAt: adSession.createdAt
      });
    }

    return Response.json({ success: true, items });
  } catch (error: any) {
    console.error("Erro em /api/admin/google-ads-costs:", error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
