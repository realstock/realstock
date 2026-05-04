const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!userToken) {
        console.log("No token found");
        return;
    }
    
    try {
        // App ID and App Secret are usually needed to debug tokens, 
        // but we can query /me/permissions using the token itself
        const res = await fetch(`https://graph.facebook.com/v19.0/me/permissions?access_token=${userToken}`);
        const data = await res.json();
        console.log("Token Permissions:", JSON.stringify(data, null, 2));
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
