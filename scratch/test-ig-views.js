const fetch = require('node-fetch');
require('dotenv').config({ path: '.env' });

async function main() {
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const finalMediaId = '17977528145842521';
    
    try {
        const insRes = await fetch(`https://graph.facebook.com/v19.0/${finalMediaId}/insights?metric=views,reach&access_token=${igToken}`);
        const insData = await insRes.json();
        console.log(`Result views/reach:`, JSON.stringify(insData, null, 2));
    } catch(e) {
        console.error(e);
    }
}
main();
