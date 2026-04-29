import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRealStockGoogleCampaign } from "@/lib/googleAds";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { propertyId, orderID } = await req.json();

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });

    const boostedDate = new Date();
    boostedDate.setDate(boostedDate.getDate() + 5);

    const sponsoredDate = new Date();
    sponsoredDate.setDate(sponsoredDate.getDate() + 30);

    // 1. Google Ads & Sponsored Status
    if (propertyId === 0) {
      // Portfolio logic
      await prisma.user.update({
        where: { id: user.id },
        data: {
          portfolioBoostedUntil: boostedDate,
          googlePortfolioBoostedUntil: boostedDate,
          reelsVideoPaidAt: new Date()
        }
      });
      
      // Try to create Google Ads Campaign
      try {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.realstock.com.br";
          await createRealStockGoogleCampaign(0, "Portfólio RealStock", 10, baseUrl);
      } catch(e) { console.error("Google Ads fail", e); }

    } else {
      // Property logic
      await prisma.property.update({
        where: { id: propertyId },
        data: {
          boostedUntil: boostedDate,
          googleBoostedUntil: boostedDate,
          sponsoredUntil: sponsoredDate,
          reelsVideoPaidAt: new Date()
        }
      });

      // Try to create Google Ads Campaign
      try {
          const prop = await prisma.property.findUnique({ where: { id: propertyId } });
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.realstock.com.br";
          const targetUrl = `${baseUrl}/imovel/${propertyId}`;
          await createRealStockGoogleCampaign(propertyId, prop?.title || "Imóvel RealStock", 10, targetUrl, prop?.city || undefined, prop?.state || undefined);
      } catch(e) { console.error("Google Ads fail", e); }
    }

    // 2. Social Media Posts (Simulated/Background)
    // In a real scenario, we'd trigger the IG/FB publish here.
    // For the "Viralizar" experience, we'll mark the sessions as pending or just create them.
    
    // 3. Financial Transaction (Already handled in capture route, but we can add more details if needed)

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("EXECUTE VIRALIZAR BUNDLE ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
