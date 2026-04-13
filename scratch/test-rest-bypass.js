const { GoogleAdsApi, enums } = require('google-ads-api');
require('dotenv').config();
const client = new GoogleAdsApi({
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
});
const customerId = process.env.GOOGLE_ADS_TARGET_CUSTOMER_ID || '';
const loginId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '';
const customer = client.Customer({customer_id: customerId, login_customer_id: loginId, refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || '' });

async function main() {
    try {
        console.log("Fetching token...");
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_ADS_CLIENT_ID,
                client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
                refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
                grant_type: 'refresh_token'
            })
        });
        const { access_token } = await tokenRes.json();
        
        console.log("1. Creating Budget via API Library");
        const budgetRes = await customer.campaignBudgets.create([{
            name: `Test Budget ${Date.now()}`,
            amount_micros: 10000000,
            delivery_method: enums.BudgetDeliveryMethod.STANDARD,
        }]);
        const budgetId = budgetRes.results[0].resource_name;
        
        console.log("2. Creating Campaign via REST");
        const mutateData = {
           operations: [
             {
               create: {
                 name: `Test Campaign REST ${Date.now()}`,
                 status: 'PAUSED',
                 advertisingChannelType: 'SEARCH',
                 networkSettings: {
                   targetGoogleSearch: true,
                   targetSearchNetwork: true,
                   targetContentNetwork: false,
                   targetPartnerSearchNetwork: false,
                 },
                 campaignBudget: budgetId,
                 manualCpc: {
                   enhancedCpcEnabled: false
                 },
                 containsEuPoliticalAdvertising: false
               }
             }
           ]
        };

        const res = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId}/campaigns:mutate`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${access_token}`,
             'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
             'login-customer-id': loginId,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify(mutateData)
        });
        
        const data = await res.json();
        if (data.error) {
           console.error("REST FAILED:", JSON.stringify(data.error, null, 2));
           return;
        }

        const campaignId = data.results[0].resourceName;
        console.log("SUCCESS REST Campaign:", campaignId);

    } catch(e) {
        console.error(e);
    }
}
main();
