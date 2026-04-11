import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
  if (!res.ok) throw new Error(data.error_description || data.error || "Falha ao autenticar no PayPal.");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const propertyId = Number(body.property_id);
    const totalCharge = Number(body.total_charge);
    const platform = body.platform || "instagram";

    if (!propertyId || !totalCharge) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos." }, { status: 400 });
    }

    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `boost_${propertyId}_${platform}`,
            amount: {
              currency_code: "BRL",
              value: totalCharge.toFixed(2),
            },
            description: `Impulsionamento Meta Ads (${platform})`,
          },
        ],
        application_context: { user_action: "PAY_NOW" },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      return NextResponse.json({ success: false, error: order.message || "Erro PayPal.", detail: order }, { status: 400 });
    }

    return NextResponse.json({ success: true, paypal_order_id: order.id });
  } catch (error: any) {
    console.error("PAYPAL CREATE BOOST ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno no PayPal" }, { status: 500 });
  }
}
