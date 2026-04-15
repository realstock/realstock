const BASE_GRAPH = "https://graph.facebook.com/v19.0";
const pageId = process.env.FACEBOOK_PAGE_ID;
const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

async function test() {
    console.log("Testing with Page ID:", pageId);
    if (!pageId || !igToken) {
        console.error("Missing FACEBOOK_PAGE_ID or INSTAGRAM_ACCESS_TOKEN");
        return;
    }

    try {
        const url = `${BASE_GRAPH}/${pageId}?fields=instagram_business_account&access_token=${igToken}`;
        console.log("Fetching:", url);
        const pRes = await fetch(url);
        const pData = await pRes.json();
        console.log("Response:", JSON.stringify(pData, null, 2));
        
        if (pData.instagram_business_account?.id) {
            console.log("Found Instagram Actor ID:", pData.instagram_business_account.id);
        } else {
            console.log("Instagram Actor ID NOT found in response.");
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

test();
