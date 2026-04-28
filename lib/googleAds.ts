import { GoogleAdsApi, enums } from 'google-ads-api';

const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
});

export const getGoogleAdsCustomer = () => {
  return client.Customer({
    customer_id: process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID || '',
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
  });
};

export async function createRealStockGoogleCampaign(
  propertyId: number,
  propertyTitle: string,
  dailyBudgetBrl: number,
  targetUrl: string
) {
  try {
    const customer = getGoogleAdsCustomer();

    // 1. Create Budget (dailyBudgetBrl in micro-reais)
    const microAmount = Math.floor(dailyBudgetBrl * 1000000);

    const budgetRes = await customer.campaignBudgets.create([
      {
        name: `Budget - Imóvel ${propertyId} - ${Date.now()}`,
        amount_micros: microAmount,
        delivery_method: enums.BudgetDeliveryMethod.STANDARD,
      },
    ]);
    const budgetResourceName = budgetRes.results[0].resource_name;

    // 2. Create Campaign
    const campaignRes = await customer.campaigns.create([
      {
        name: `Campanha Imóvel - ${propertyId} - ${Date.now()}`,
        status: enums.CampaignStatus.ENABLED, 
        advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
        network_settings: {
          target_google_search: true,
          target_search_network: true,
          target_content_network: false,
          target_partner_search_network: false,
        },
        campaign_budget: budgetResourceName,
        manual_cpc: {
           enhanced_cpc_enabled: false
        },
        contains_eu_political_advertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
      } as any,
    ]);
    const campaignResourceName = campaignRes.results[0].resource_name;

    // 3. Create AdGroup
    const groupName = `Grupo - ${propertyTitle}`.substring(0, 255);
    const adGroupRes = await customer.adGroups.create([
      {
        campaign: campaignResourceName,
        name: groupName,
        type: enums.AdGroupType.SEARCH_STANDARD,
        status: enums.AdGroupStatus.ENABLED,
        cpc_bid_micros: 2000000 // R$ 2.00 por clique de teto
      },
    ]);
    const adGroupResourceName = adGroupRes.results[0].resource_name;

    // 4. Create Ad
    const safeTitle = propertyTitle.length > 30 ? propertyTitle.substring(0, 27) + "..." : propertyTitle;
    
    await customer.adGroupAds.create([
      {
        ad_group: adGroupResourceName,
        status: enums.AdGroupAdStatus.ENABLED,
        ad: {
          responsive_search_ad: {
            headlines: [
              { text: "Lindo Imóvel Disponível", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
              { text: safeTitle, pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
              { text: "Agende sua visita na RealStock", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
            ],
            descriptions: [
              { text: "Venha conhecer esta excelente oportunidade exclusiva da RealStock. Agende online." },
              { text: "Opção imperdível para compra ou locação. Fale com um de nossos corretores experts." },
            ],
            path1: "imovel",
            path2: propertyId.toString().substring(0, 15),
          },
          final_urls: [targetUrl],
        },
      },
    ]);

    const campaignId = campaignResourceName?.split('/')[3] || "";
    const adGroupId = adGroupResourceName?.split('/')[3] || "";

    return { campaignId, adGroupId, success: true };
  } catch (err: any) {
    console.error("Google Ads API Creation Error:", err);
    return { success: false, error: err.message };
  }
}

export async function getGoogleAdsCampaignInsights(campaignId: string) {
  try {
    const customer = getGoogleAdsCustomer();

    // GAQL query to fetch metrics for a specific campaign
    const query = `
      SELECT
        metrics.clicks,
        metrics.impressions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        campaign.status
      FROM campaign
      WHERE campaign.id = ${campaignId}
    `;

    const result = await customer.query(query);

    if (result && result.length > 0) {
      const metrics = result[0].metrics as any;
      
      return {
        success: true,
        clicks: Number(metrics.clicks) || 0,
        impressions: Number(metrics.impressions) || 0,
        ctr: Number(metrics.ctr) ? (Number(metrics.ctr) * 100).toFixed(2) : "0.00",
        // cost and cpc are in micros
        cost: Number(metrics.cost_micros) ? (Number(metrics.cost_micros) / 1000000) : 0,
        cpc: Number(metrics.average_cpc) ? (Number(metrics.average_cpc) / 1000000) : 0,
        status: result[0].campaign?.status || "UNKNOWN"
      };
    }

    return { success: false, error: "Campanha não encontrada" };
  } catch (err: any) {
    console.error("Google Ads API Analytics Error:", err);
    return { success: false, error: err.message };
  }
}
