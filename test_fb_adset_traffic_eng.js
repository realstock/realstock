const fetch = require('node-fetch');
const token = "EAASHir4PoI4BRBRUZBKqcoBghRgo0dWC7esEEETkgbJT9fRdnfzwIhiD4cEcyn613HSUB3JCHQr03O5miHGJ8yQOHqMwdUwfFPhGdNoPx6UEZBueQs7d2vzFRdzKP399nHOTv8ZA6Gfa6R6vQKqKwcOV2jTOyOkfod21gn12Y5dTITjfeOsxiGuoZClRShN2qwZDZD";
const act = "act_1718102826222467";
const pageId = "1100957826423325";
const actorId = "17841466888362218";
const igMediaId = "18025211516010078";
const campId = "120244946697500663"; // Traffic Campaign

async function run() {
    let params = new URLSearchParams();
    params.append("name", "Test AdSet TRF+ENG");
    params.append("campaign_id", campId);
    params.append("daily_budget", "2200");
    params.append("billing_event", "IMPRESSIONS");
    params.append("optimization_goal", "POST_ENGAGEMENT");
    params.append("promoted_object", JSON.stringify({ page_id: pageId }));
    params.append("bid_strategy", "LOWEST_COST_WITHOUT_CAP");
    const targeting = {
        age_max: 65, age_min: 18,
        geo_locations: { countries: ["BR"] },
        publisher_platforms: ["instagram"],
        instagram_positions: ["stream"]
    };
    params.append("targeting", JSON.stringify(targeting));
    params.append("status", "PAUSED");

    let res = await fetch(`https://graph.facebook.com/v19.0/${act}/adsets?access_token=${token}`, { method: "POST", body: params });
    const adset = await res.json();
    console.log("AdSet:", adset);
    if (!adset.id) return;

    params = new URLSearchParams();
    params.append("name", "Test Creative");
    params.append("object_story_spec", JSON.stringify({
        page_id: pageId,
        instagram_actor_id: actorId,
        source_instagram_media_id: igMediaId
    }));
    res = await fetch(`https://graph.facebook.com/v19.0/${act}/adcreatives?access_token=${token}`, { method: "POST", body: params });
    console.log("Creative:", await res.json());
}
run();
