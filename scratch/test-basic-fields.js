require('dotenv').config();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const mediaId = "18076225190312733"; 
  
  const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}?fields=like_count,comments_count&access_token=${igToken}`);
  const data = await res.json();
  
  console.log("DADOS BÁSICOS (LIKES/COMMENTS):", JSON.stringify(data, null, 2));
}

main();
