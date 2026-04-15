
const { URLSearchParams } = require('url');

// Mock data
const igToken = "EAAB...mock_token";
const adAccountId = "act_123456789";
const pubId = "cmnyk8sl...";

console.log("--- TESTANDO CRIAÇÃO DE CAMPANHA (ADMIN - AWARENESS/REACH) ---");

const campaignForm = new URLSearchParams();
campaignForm.append("name", `Admin Sponsored Lote: ${pubId}`);
campaignForm.append("objective", "OUTCOME_AWARENESS");
campaignForm.append("status", "ACTIVE");
campaignForm.append("special_ad_categories", '["HOUSING"]');
campaignForm.append("special_ad_category_country", '["BR"]');
campaignForm.append("is_adset_budget_sharing_enabled", "false"); 
campaignForm.append("access_token", igToken);

console.log("Campaign Params (Admin):", campaignForm.toString());

if (campaignForm.get("objective") === "OUTCOME_AWARENESS" && campaignForm.get("is_adset_budget_sharing_enabled") === "false") {
    console.log("✅ SUCCESS: Admin Campaign params are correct.");
} else {
    console.log("❌ ERROR: Admin Campaign params mismatch.");
}

console.log("\n--- TESTANDO CRIAÇÃO DE CAMPANHA (USER - ENGAGEMENT/POST_ENGAGEMENT) ---");

const userCampaignForm = new URLSearchParams();
userCampaignForm.append("objective", "OUTCOME_ENGAGEMENT");
userCampaignForm.append("is_adset_budget_sharing_enabled", "false");

console.log("Campaign Params (User):", userCampaignForm.toString());
if (userCampaignForm.get("objective") === "OUTCOME_ENGAGEMENT") {
    console.log("✅ SUCCESS: User Campaign objective is correct.");
} else {
    console.log("❌ ERROR: User Campaign objective mismatch.");
}

console.log("\n--- TESTANDO CRIAÇÃO DE ADSET (BOTH) ---");

const adSetForm = new URLSearchParams();
adSetForm.append("bid_strategy", "LOWEST_COST_WITHOUT_CAP"); 

console.log("AdSet Params:", adSetForm.toString());

if (adSetForm.get("bid_strategy") === "LOWEST_COST_WITHOUT_CAP") {
    console.log("✅ SUCCESS: bid_strategy is correct.");
} else {
    console.log("❌ ERROR: bid_strategy IS MISSING.");
}
