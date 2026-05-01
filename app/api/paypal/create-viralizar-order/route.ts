import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API = process.env.PAYPAL_API_BASE || (process.env.PAYPAL_MODE === "live" 
  ? "https://api-m.paypal.com" 
  : "https://api-m.sandbox.paypal.com");

async function getAccessToken() {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || "Falha na autenticação do PayPal");
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { propertyId } = await req.json();

    // Buscar taxas no banco para garantir o valor correto
    const isPortfolio = propertyId === 0 || propertyId === "0";
    const services = await prisma.siteService.findMany({
      where: { isActive: true },
      include: { fee: true }
    });

    const viralizarServices = [
      { keywords: ["patrocinar site", "anuncio patrocinado"], defaultValue: isPortfolio ? 0 : 50 },
      { keywords: ["criar vídeo", "vídeo ia"], defaultValue: 0 },
      { keywords: ["carrossel instagram", "post de anuncio"], defaultValue: isPortfolio ? 100 : 50 },
      { keywords: ["video instagram", "reel instagram"], defaultValue: isPortfolio ? 100 : 50 },
      { keywords: ["carrossel facebook"], defaultValue: isPortfolio ? 100 : 50 },
      { keywords: ["video facebook", "reel facebook"], defaultValue: isPortfolio ? 100 : 50 },
    ];

    const amount = viralizarServices.reduce((acc, v) => {
      const found = services.find(s => v.keywords.some(k => s.name.toLowerCase().includes(k)));
      return acc + (found && found.fee ? Number(found.fee.value) : v.defaultValue);
    }, 0) * 0.5;

    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "BRL",
              value: amount.toFixed(2),
            },
            description: `Pacote Viralizar - Imóvel ${propertyId}`,
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("PAYPAL ERROR DETAILS:", data);
      return NextResponse.json({ 
        success: false, 
        error: data.message || "Erro na API do PayPal. Verifique as credenciais no .env." 
      }, { status: response.status });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error("PAYPAL CREATE VIRALIZAR ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
