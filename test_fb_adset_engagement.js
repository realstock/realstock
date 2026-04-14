const fetch = require('node-fetch');
const token = "EAASHir4PoI4BRBRUZBKqcoBghRgo0dWC7esEEETkgbJT9fRdnfzwIhiD4cEcyn613HSUB3JCHQr03O5miHGJ8yQOHqMwdUwfFPhGdNoPx6UEZBueQs7d2vzFRdzKP399nHOTv8ZA6Gfa6R6vQKqKwcOV2jTOyOkfod21gn12Y5dTITjfeOsxiGuoZClRShN2qwZDZD";
const act = "act_1718102826222467";
const pageId = "1100957826423325";
const campId = "120245072285220663"; // The OUTCOME_ENGAGEMENT HOUSING campaign just created

async function run() {
    let params = new URLSearchParams();
    params.append("name", "Test AdSet");
    params.append("campaign_id", campId);
    params.append("daily_budget", "2200");
    params.append("billing_event", "IMPRESSIONS");
    params.append("optimization_goal", "ENGAGEMENT");
    params.append("promoted_object", JSON.stringify({ page_id: pageId }));
    params.append("bid_strategy", "LOWEST_COST_WITHOUT_CAP");
    params.append("status", "PAUSED");

    let res = await fetch(`https://graph.facebook.com/v19.0/${act}/adsets?access_token=${token}`, { method: "POST", body: params });
    console.log("ENGAGEMENT AdSet:", await res.json());

    params.set("optimization_goal", "THRUPLAY");
    res = await fetch(`https://graph.facebook.com/v19.0/${act}/adsets?access_token=${token}`, { method: "POST", body: params });
    console.log("THRUPLAY AdSet:", await res.json());

    params.set("optimization_goal", "REACH");
    res = await fetch(`https://graph.facebook.com/v19.0/${act}/adsets?access_token=${token}`, { method: "POST", body: params });
    console.log("REACH AdSet:", await res.json());
}
run();
