const { GoogleAdsApi, enums } = require('google-ads-api');
require('dotenv').config();
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
});
const customer = client.Customer({customer_id: process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID || '', login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '', refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '' });

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
            campaign_budget: budgetId,
            bidding_strategy_type: enums.BiddingStrategyType.MAXIMIZE_CLICKS,
            network_settings: {
                target_google_search: true
            }
        }]);
        const campaignId = campaignRes.results[0].resource_name;
        console.log("SUCCESS Campaign:", campaignId);
    } catch(e) {
        console.error(JSON.stringify(e.errors, null, 2));
    }
}
main();
