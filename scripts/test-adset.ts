import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const BASE_GRAPH = "https://graph.facebook.com/v19.0";

    // 1. CRIA CAMPANHA MOCK
    const campaignForm = new URLSearchParams();
    campaignForm.append("name", `Mock Campaign Test`);
    campaignForm.append("objective", "OUTCOME_TRAFFIC");
    campaignForm.append("status", "PAUSED");
    campaignForm.append("special_ad_categories", '["HOUSING"]');
    campaignForm.append("is_adset_budget_sharing_enabled", "false");
    campaignForm.append("access_token", igToken!);

    const campRes = await fetch(`${BASE_GRAPH}/${adAccountId}/campaigns`, { method: "POST", body: campaignForm });
    const campData = await campRes.json();
    if (!campData.id) { console.error("ERRO CAMPANHA MOCK FB", campData); return; }
    
    console.log("Mock Campanha ID:", campData.id);

    // 2. CRIA ADSET MOCK
    const endTime = new Date();
    endTime.setDate(endTime.getDate() + 5);

    const formData = {
        name: "Mock AdSet",
        campaign_id: campData.id,
        daily_budget: "1000",
        billing_event: "IMPRESSIONS",
        optimization_goal: "LINK_CLICKS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        targeting: JSON.stringify({ geo_locations: { countries: ["BR"] }, publisher_platforms: ["instagram"]}),
        status: "PAUSED",
        end_time: endTime.toISOString(),
        access_token: igToken!
    };

    const adSetForm = new URLSearchParams();
    for (const [k, v] of Object.entries(formData)) adSetForm.append(k, v);

    const adSetRes = await fetch(`${BASE_GRAPH}/${adAccountId}/adsets`, { method: "POST", body: adSetForm });
    const adSetData = await adSetRes.json();
    console.dir(adSetData, {depth: null});
}
main();
