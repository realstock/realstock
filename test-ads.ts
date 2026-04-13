import { GoogleAdsApi, enums } from 'google-ads-api';
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
        console.log("1. Creating Budget");
        const budgetRes = await customer.campaignBudgets.create([{
            name: `Test Budget ${Date.now()}`,
            amount_micros: 10000000,
            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        }]);
        console.log("Budget OK:", budgetRes.results[0].resource_name);
        
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
            campaign_budget: budgetRes.results[0].resource_name,
            manual_cpc: {}
        }]);
        console.log("Campaign OK:", campaignRes.results[0].resource_name);
    } catch(e) {
        console.error("ERROR:");
        console.error(JSON.stringify(e.errors, null, 2));
    }
}
main();
