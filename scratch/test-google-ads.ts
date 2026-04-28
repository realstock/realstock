import { getGoogleAdsCustomer } from '../lib/googleAds';
import { enums } from 'google-ads-api';

async function test() {
    const customer = getGoogleAdsCustomer();
    const microAmount = 10000000; // 10 BRL

    try {
        console.log("1. Creating Budget...");
        const budgetRes = await customer.campaignBudgets.create([{
            name: `Test Budget ${Date.now()}`,
            amount_micros: microAmount,
            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        }]);
        const budgetResourceName = budgetRes.results[0].resource_name;

        console.log("2. Creating Campaign...");
        const campaignRes = await customer.campaigns.create([{
            name: `Test Campaign ${Date.now()}`,
            status: enums.CampaignStatus.PAUSED, // Paused so it doesn't spend!
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
        } as any]);
        const campaignResourceName = campaignRes.results[0].resource_name;
        console.log("Campaign created:", campaignResourceName);

    } catch (err: any) {
        console.error("FAIL:", JSON.stringify(err, null, 2));
    }
}
test();
