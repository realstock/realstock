import { PrismaClient } from "@prisma/client";
import { GoogleAdsApi, enums } from 'google-ads-api';

const prisma = new PrismaClient();
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
});

async function activateExistingCampaigns() {
  console.log("🚀 Iniciando ativação em massa de campanhas do Google Ads...");

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

  console.log(`🔍 Encontradas ${activeSessions.length} sessões ativas no banco.`);

  for (const session of activeSessions) {
    if (session.campaignId && !session.campaignId.includes("MOCK")) {
      try {
        console.log(`⏳ Ativando Campanha: ${session.campaignId}...`);
        
        await customer.campaigns.update([
          {
            resource_name: `customers/${process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID}/campaigns/${session.campaignId}`,
            status: enums.CampaignStatus.ENABLED,
          },
        ]);

        console.log(`✅ Campanha ${session.campaignId} ativada com sucesso!`);
      } catch (err: any) {
        console.error(`❌ Erro ao ativar ${session.campaignId}:`, err.message);
      }
    }
  }

  console.log("✨ Processo concluído!");
}

activateExistingCampaigns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
