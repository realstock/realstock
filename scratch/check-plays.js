require('dotenv').config();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const ids = ["18089305223227888", "18517777516078516", "18076225190312733", "18133585780533620"];
  
  for (const mediaId of ids) {
    // Tentar métrica de Reels/Vídeo especificamente
    const url = `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=plays&access_token=${igToken}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`ID ${mediaId} PLAYS:`, JSON.stringify(data, null, 2));
  }
}

main();
