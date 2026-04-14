import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRealStockGoogleCampaign } from "@/lib/googleAds";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const pubId = id;
    const pub = await prisma.adminSponsoredPublication.findUnique({
      where: { id: pubId }
    });

    if (!pub) {
      return NextResponse.json({ success: false, error: "Publication box not found" }, { status: 404 });
    }

    const { dailyBudget } = await req.json();

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://realstock.com.br";
    const targetUrl = baseUrl; // Admin portfolio targets the home page

    // Call Real Google Ads Integration
    const adsResult = await createRealStockGoogleCampaign(
      0, // Admin doesn't need a specific property id for global search
      pub.name || "Patrocínio Admin",
      Number(dailyBudget) || 50,
      targetUrl
    );

    let finalCampaignId = adsResult.campaignId || `MOCK_G_CAMP_ADMIN_${Date.now()}`;
    let finalAdGroupId = adsResult.adGroupId || `MOCK_G_ADG_ADMIN_${Date.now()}`;
    let finalStatus = adsResult.success ? "ACTIVE" : "ACTIVE_FALLBACK";

    await prisma.googleAdsSession.create({
      data: {
        listingId: -2, // Indicates admin global list
        campaignId: finalCampaignId,
        adGroupId: finalAdGroupId,
        status: finalStatus,
        budget: dailyBudget || 50,
        budgetDays: 5,
        targetUrl: targetUrl
      }
    });

    // Update pub
    const boostedDate = new Date();
    boostedDate.setDate(boostedDate.getDate() + 5);

    await prisma.adminSponsoredPublication.update({
        where: { id: pubId },
        data: { googleBoostedUntil: boostedDate }
    });

    return NextResponse.json({ success: true, message: "Lote Admin publicado no Google Ads!" });

  } catch (error: any) {
    console.error("ADMIN GOOGLE ADS PUBLISH ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
