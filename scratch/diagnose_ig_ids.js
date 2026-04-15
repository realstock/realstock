const BASE_GRAPH = "https://graph.facebook.com/v19.0";
const pageId = process.env.FACEBOOK_PAGE_ID;
const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

async function diagnose() {
    if (!pageId || !igToken) {
        console.error("Missing ENV vars");
        return;
    }

    console.log("--- DIAGNOSING PAGE IDs ---");
    
    // 1. Check Page directly
    try {
        const res = await fetch(`${BASE_GRAPH}/${pageId}?fields=instagram_business_account,username,name&access_token=${igToken}`);
        const data = await res.json();
        console.log("Page Data:", JSON.stringify(data, null, 2));
    } catch(e) { console.error("Page check failed", e); }

    // 2. Check instagram_accounts edge
    try {
        const res = await fetch(`${BASE_GRAPH}/${pageId}/instagram_accounts?fields=id,username&access_token=${igToken}`);
        const data = await res.json();
        console.log("Instagram Accounts Edge:", JSON.stringify(data, null, 2));
    } catch(e) { console.error("Instagram accounts edge failed", e); }

    // 3. Check /me/accounts
    try {
        const res = await fetch(`${BASE_GRAPH}/me/accounts?fields=id,name,instagram_business_account&access_token=${igToken}`);
        const data = await res.json();
        console.log("Me Accounts:", JSON.stringify(data, null, 2));
    } catch(e) { console.error("Me accounts failed", e); }
    
    // 4. Check /me
    try {
        const res = await fetch(`${BASE_GRAPH}/me?fields=id,name&access_token=${igToken}`);
        const data = await res.json();
        console.log("Me Detail:", JSON.stringify(data, null, 2));
    } catch(e) { console.error("Me detail failed", e); }
}

diagnose();
