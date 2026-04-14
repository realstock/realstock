const token = process.env.INSTAGRAM_ACCESS_TOKEN;
const pageId = process.env.FACEBOOK_PAGE_ID;

async function run() {
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${token}`);
    const data = await res.json();
    console.log(data);
}
run();
