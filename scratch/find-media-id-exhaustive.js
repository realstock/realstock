require('dotenv').config();

async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = "17841466888362218";
  const targetId = "18076225190312733";
  
  let url = `https://graph.facebook.com/v19.0/${igUserId}/media?fields=id,permalink,caption&access_token=${igToken}&limit=100`;
  
  let found = false;
  for (let i = 0; i < 20; i++) {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.data) break;
    
    const match = data.data.find(m => m.id === targetId);
    if (match) {
      console.log("SUCESSO! ENCONTREI O POST:", JSON.stringify(match, null, 2));
      found = true;
      break;
    }
    
    if (!data.paging?.next) break;
    url = data.paging.next;
    console.log(`Buscando em mais 100 posts... (página ${i+2})`);
  }
  
  if (!found) console.log("O POST NÃO PERTENCE A ESTA CONTA!");
}

main();
