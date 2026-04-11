import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Iniciando Teste da Meta API (Por trás dos panos)...");

    const adAccountId = process.env.FACEBOOK_AD_ACCOUNT_ID;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    const igUserId = process.env.INSTAGRAM_IG_USER_ID;

    if (!adAccountId || !pageId || !igToken || !igUserId) {
        console.error("❌ ERRO: Faltam variáveis no .env!");
        console.log({
            adAccountId: !!adAccountId,
            pageId: !!pageId,
            igToken: !!igToken,
            igUserId: !!igUserId
        });
        return;
    }

    const BASE_GRAPH = "https://graph.facebook.com/v19.0";

    try {
        console.log("\n1. Testando conexão com a Conta de Anúncios...");
        const adRes = await fetch(`${BASE_GRAPH}/${adAccountId}?fields=name,account_status&access_token=${igToken}`);
        const adData = await adRes.json();
        
        if (adData.error) {
            console.error("❌ ERRO na Conta de Anúncios:", adData.error.message);
        } else {
            console.log("✅ CONTA LIGADA COM SUCESSO!");
            console.log(`   Nome: ${adData.name}`);
            console.log(`   Status Interno: ${adData.account_status}`);
        }

        console.log("\n2. Testando permissão de acesso da Página do Facebook...");
        const pageRes = await fetch(`${BASE_GRAPH}/${pageId}?fields=name,id&access_token=${igToken}`);
        const pageData = await pageRes.json();

        if (pageData.error) {
            console.error("❌ ERRO na Página de Destino:", pageData.error.message);
        } else {
            console.log("✅ PÁGINA ENCONTRADA COM SUCESSO!");
            console.log(`   Nome da Página: ${pageData.name}`);
        }

    } catch (e: any) {
        console.error("\n❌ ERRO FATAL DE REQUISIÇÃO:", e.message);
    }
}

main();
