const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    
    try {
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find(p => p.id === pageId);

        if (!pageInfo) {
            console.log("Page info not found!");
            return;
        }

        console.log("Page Token:", pageInfo.access_token.substring(0, 10) + '...');
        
        // Let's list the posts on the page to see valid IDs
        const postsRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?access_token=${pageInfo.access_token}`);
        const postsData = await postsRes.json();
        
        console.log("Recent Posts:");
        if (postsData.data) {
            postsData.data.slice(0, 3).forEach(post => {
                console.log(`- ID: ${post.id}, Message: ${post.message?.substring(0, 30)}...`);
            });
        } else {
            console.log("No posts found or error:", postsData);
        }
        
        const publishedPostId = '1100957826423325_122108207834883331';
        console.log(`\nTrying to fetch specific post: ${publishedPostId}`);
        const postRes = await fetch(`https://graph.facebook.com/v19.0/${publishedPostId}?fields=id,message&access_token=${pageInfo.access_token}`);
        const postData = await postRes.json();
        console.log("Post Response:", JSON.stringify(postData));

    } catch(e) {
        console.error("Error:", e);
    }
}
main();
