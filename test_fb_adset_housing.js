const fetch = require('node-fetch');
const token = "EAASHir4PoI4BRBRUZBKqcoBghRgo0dWC7esEEETkgbJT9fRdnfzwIhiD4cEcyn613HSUB3JCHQr03O5miHGJ8yQOHqMwdUwfFPhGdNoPx6UEZBueQs7d2vzFRdzKP399nHOTv8ZA6Gfa6R6vQKqKwcOV2jTOyOkfod21gn12Y5dTITjfeOsxiGuoZClRShN2qwZDZD";
const act = "act_1718102826222467";
const pageId = "1100957826423325";

async function run() {
    let params = new URLSearchParams();
    params.append("name", "Test ODAX Eng 2");
    params.append("objective", "OUTCOME_ENGAGEMENT");
    params.append("status", "PAUSED");
    params.append("special_ad_categories", '["HOUSING"]');
    params.append("special_ad_category_country", '["BR"]');
    // Fix error 4834011
    params.append("is_adset_budget_sharing_enabled", "false");
    
    let res = await fetch(`https://graph.facebook.com/v19.0/${act}/campaigns?access_token=${token}`, { method: "POST", body: params });
    const camp = await res.json();
    console.log("Campaign:", camp);
    if (!camp.id) return;

    params = new URLSearchParams();
    params.append("name", "Test AdSet");
    params.append("campaign_id", camp.id);
    params.append("daily_budget", "2200");
    params.append("billing_event", "IMPRESSIONS");
    params.append("optimization_goal", "POST_ENGAGEMENT");
    params.append("promoted_object", JSON.stringify({ page_id: pageId }));
    params.append("bid_strategy", "LOWEST_COST_WITHOUT_CAP");
    const targeting = {
        age_max: 65, age_min: 18,
        geo_locations: { countries: ["BR"] }
    };
    params.append("targeting", JSON.stringify(targeting));
    params.append("status", "PAUSED");

    res = await fetch(`https://graph.facebook.com/v19.0/${act}/adsets?access_token=${token}`, { method: "POST", body: params });
    console.log("AdSet:", await res.json());
}
run();
