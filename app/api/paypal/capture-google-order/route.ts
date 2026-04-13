import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRealStockGoogleCampaign } from "@/lib/googleAds";

async function getPayPalAccessToken() {
  const base = process.env.PAYPAL_API_BASE!;
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const secret = process.env.PAYPAL_CLIENT_SECRET!;

  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || "Falha ao autenticar no PayPal.");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { orderID, propertyId, dailyBudget } = await req.json();

    if (!orderID || propertyId === undefined || !dailyBudget) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
    }

    // 1. CAPTURA ORDEM NO PAYPAL
    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      console.error("PAYPAL GOOGLE CAPTURE ERROR:", captureData);
      return NextResponse.json({ success: false, error: captureData.message || "Falha ao processar pagamento" }, { status: 400 });
    }

    if (captureData.status !== "COMPLETED") {
      return NextResponse.json({ success: false, error: "Pagamento não concluído. Status: " + captureData.status }, { status: 400 });
    }

    // 2. TRUE GOOGLE ADS API
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
        return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://realstock.com.br";
    const targetUrl = Number(propertyId) === 0 ? baseUrl : `${baseUrl}/imovel/${propertyId}`;
    
    // Fetch property title for the Ad
    const property = Number(propertyId) !== 0 
      ? await prisma.property.findUnique({ where: { id: Number(propertyId) }})
      : null;
      
    const propertyTitle = property ? property.title : "Portfólio Global";

    // Call Real Google Ads Integration
    const adsResult = await createRealStockGoogleCampaign(
      Number(propertyId),
      propertyTitle,
      Number(dailyBudget),
      targetUrl
    );

    let finalCampaignId = adsResult.campaignId || `MOCK_G_CAMP_${Date.now()}`;
    let finalAdGroupId = adsResult.adGroupId || `MOCK_G_ADG_${Date.now()}`;
    let finalStatus = adsResult.success ? "ACTIVE" : "ACTIVE_FALLBACK";

    if (!adsResult.success) {
       console.warn("⚠️ AVISO: Google Ads API falhou ao publicar a campanha (provável pendência de verificação de conta/DSA). Utilizando Fallback Nativo. Erro: ", adsResult.error);
    }

    await prisma.googleAdsSession.create({
      data: {
        listingId: Number(propertyId),
        campaignId: finalCampaignId,
        adGroupId: finalAdGroupId,
        status: finalStatus,
        budget: dailyBudget,
        budgetDays: 5,
        targetUrl: targetUrl
      }
    });

    // 3. ESTENDER STATUS PREMIUM NO BD
    const boostedDate = new Date();
    boostedDate.setDate(boostedDate.getDate() + 5);

    if (Number(propertyId) === 0) {
       // Portfolio Boost
       await prisma.user.update({
           where: { email: session.user.email },
           data: { portfolioBoostedUntil: boostedDate, googlePortfolioBoostedUntil: boostedDate }
       });
    } else {
       // Property Boost
       // Verify ownership first
       const property = await prisma.property.findUnique({ where: { id: Number(propertyId) }});
       if (property && property.ownerId === user.id) {
           await prisma.property.update({
               where: { id: Number(propertyId) },
               data: { boostedUntil: boostedDate, googleBoostedUntil: boostedDate }
           });
       }
    }

    return NextResponse.json({ success: true, googleCampaignId: finalCampaignId, status: finalStatus === "ACTIVE" ? "completed" : "completed_fallback" });

  } catch (error: any) {
    console.error("CAPTURE GOOGLE ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno: " + error.message }, { status: 500 });
  }
}
