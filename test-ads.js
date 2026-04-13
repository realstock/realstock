const { GoogleAdsApi, enums } = require('google-ads-api');
require('dotenv').config();
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
});
const customer = client.Customer({
    customer_id: process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID || '',
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '',
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '',
});

async function main() {
    try {
        const budgetRes = await customer.campaignBudgets.create([{
            name: `Test Budget ${Date.now()}`,
            amount_micros: 10000000,
            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        }]);
        const budgetId = budgetRes.results[0].resource_name;
        
        console.log("2. Creating Campaign");
        const campaignRes = await customer.campaigns.create([{
            name: `Test Campaign ${Date.now()}`,
            status: enums.CampaignStatus.PAUSED,
            advertising_channel_type: enums.AdvertisingChannelType.SEARCH,
            network_settings: {
                target_google_search: true,
                target_search_network: true,
                target_content_network: false,
                target_partner_search_network: false,
            },
            campaign_budget: budgetId,
            bidding_strategy_type: enums.BiddingStrategyType.MANUAL_CPC,
            manual_cpc: {
                enhanced_cpc_enabled: false
            }
        }]);
        const campaignId = campaignRes.results[0].resource_name;
        console.log("Campaign OK:", campaignId);

        console.log("3. Creating AdGroup");
        const adGroupRes = await customer.adGroups.create([{
           campaign: campaignId,
           name: `Test AdGroup ${Date.now()}`,
           type: enums.AdGroupType.SEARCH_STANDARD,
           status: enums.AdGroupStatus.ENABLED,
           cpc_bid_micros: 1000000 // Requires CPC bid since it's MANUAL_CPC
        }]);
        const adGroupId = adGroupRes.results[0].resource_name;
        console.log("AdGroup OK:", adGroupId);

        console.log("4. Creating Ad");
        await customer.adGroupAds.create([{
            ad_group: adGroupId,
            status: enums.AdGroupAdStatus.ENABLED,
            ad: {
                responsive_search_ad: {
                    headlines: [
                        { text: "Lindo Imóvel Disponível", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
                        { text: "Agende sua visita hoje", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED },
                        { text: "Corretor 24 horas Brasil", pinned_field: enums.ServedAssetFieldType.UNSPECIFIED }
                    ],
                    descriptions: [
                        { text: "Venha conhecer esta excelente oportunidade exclusiva. Agende online o quanto antes." },
                        { text: "Opção imperdível para compra ou locação. Fale com um de nossos corretores experts." }
                    ],
                    path1: "imovel",
                    path2: "123"
                },
                final_urls: ["https://realstock.com.br"]
            }
        }]);
        console.log("Ad OK!");
    } catch(e) {
        console.error("ERROR:");
        console.error(JSON.stringify(e.errors, null, 2));
    }
}
main();
