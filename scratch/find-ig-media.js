const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
require('dotenv').config({ path: '.env' });

async function main() {
    try {
        const userToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        const pageId = process.env.FACEBOOK_PAGE_ID;
        
        // 1. Get Page Info to get the Instagram Business Account ID
        const pageTokenRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
        const pageTokenData = await pageTokenRes.json();
        const pageInfo = pageTokenData.data?.find(p => p.id === pageId);
        
        if (!pageInfo) {
            console.log("Page info not found!");
            return;
        }
        
        // 2. Get Instagram Business Account ID linked to the Facebook Page
        const igAccRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageInfo.access_token}`);
        const igAccData = await igAccRes.json();
        const igAccountId = igAccData.instagram_business_account?.id;
        
        if (!igAccountId) {
            console.log("No Instagram Business Account linked to this page.");
            return;
        }
        console.log(`Instagram Account ID: ${igAccountId}`);

        // 3. Fetch recent media from Instagram
        const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}/media?fields=id,caption,media_type,like_count,permalink&limit=10&access_token=${pageInfo.access_token}`);
        const mediaData = await mediaRes.json();
        
        console.log("Recent Instagram Media:");
        if (mediaData.data) {
            mediaData.data.forEach(m => {
                const preview = m.caption ? m.caption.substring(0, 50).replace(/\n/g, ' ') : '[No Caption]';
                console.log(`- ID: ${m.id} | Type: ${m.media_type} | Likes: ${m.like_count} | Link: ${m.permalink}`);
                console.log(`  Caption: ${preview}...`);
            });
            
            // Look for the one matching property 37
            const targetMedia = mediaData.data.find(m => m.caption && m.caption.includes('37'));
            if (targetMedia) {
                console.log(`\nFound matching media for 37: ${targetMedia.id}`);
                
                // Update the database!
                await prisma.property.update({
                    where: { id: 37 },
                    data: {
                        instagramMediaId: targetMedia.id,
                        instagramPermalink: targetMedia.permalink
                    }
                });
                console.log("Updated Property 37 with real Instagram Media ID!");
            } else {
                console.log("\nCould not find a media with '37' in the caption.");
            }
        }
    } catch(e) {
        console.error("Error:", e);
    }
}
main();
