const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find(p => p.id === pageId);

        const postsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?fields=id,message,status_type,attachments&access_token=${pageInfo.access_token}`);
        const postsData = await postsRes.json();
        
        console.log("Recent FB posts:");
        if (postsData.data) {
            for (const post of postsData.data) {
                console.log(`- ID: ${post.id}, Type: ${post.status_type}`);
                console.log(`  Message: ${post.message?.substring(0, 50).replace(/\n/g, ' ')}`);
                if (post.attachments && post.attachments.data) {
                    console.log(`  Attachments: ${post.attachments.data.map(a => a.type).join(', ')}`);
                }
            }
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
