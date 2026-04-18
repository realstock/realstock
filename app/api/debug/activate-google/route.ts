import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleAdsApi, enums } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
});

export async function GET() {
  try {
    console.log("🚀 Iniciando ativação forçada de Google Ads via API...");

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID || '',
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
    });

    const activeSessions = await prisma.googleAdsSession.findMany({
      where: {
        status: "ACTIVE"
      }
    });

    let count = 0;
    for (const session of activeSessions) {
      if (session.campaignId && !session.campaignId.includes("MOCK")) {
        try {
          await customer.campaigns.update([
            {
              resource_name: `customers/${process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID}/campaigns/${session.campaignId}`,
              status: enums.CampaignStatus.ENABLED,
            },
          ]);
          count++;
        } catch (e: any) {
          console.error(`Falha ao ativar ${session.campaignId}:`, e.message);
        }
      }
    }

    return NextResponse.json({ success: true, activatedCount: count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
