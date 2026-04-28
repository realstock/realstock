import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const { propertyId } = await req.json();

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const base = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!tokenRes.ok) {
       throw new Error("Falha na autenticação do PayPal.");
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Buscar Valor do Banco (Slug: reels)
    const siteService = await prisma.siteService.findFirst({
      where: { slug: "reels" },
      include: { fee: true }
    });

    const feeValue = siteService?.fee?.value 
      ? Number(siteService.fee.value).toFixed(2) 
      : "29.90"; 

    const orderRes = await fetch(`${base}/v2/checkout/orders`, {
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
              value: feeValue,
            },
            description: `Taxa de Criação de Vídeo Reels - Imóvel #${propertyId}`,
          },
        ],
      }),
    });

    const orderData = await orderRes.json();

    return NextResponse.json({
      success: true,
      paypal_order_id: orderData.id,
    });
  } catch (error: any) {
    console.error("PAYPAL REELS ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
