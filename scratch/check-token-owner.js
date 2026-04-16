async function main() {
  const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const res = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${igToken}`);
  const data = await res.json();
  console.log("CONTAS VINCULADAS AO TOKEN:", JSON.stringify(data, null, 2));
}

main();
