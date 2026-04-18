import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

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
       const errorData = await tokenRes.json();
       console.error("PAYPAL AUTH ERROR:", errorData);
       throw new Error(`Falha na autenticação do PayPal: ${JSON.stringify(errorData)}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Buscar Valor Dinâmico do Banco
    const siteService = await prisma.siteService.findFirst({
      where: { 
        OR: [
          { name: { contains: "logo", mode: "insensitive" } },
          { slug: "logo" }
        ]
      },
      include: { fee: true }
    });

    const feeValue = siteService?.fee?.value 
      ? Number(siteService.fee.value).toFixed(2) 
      : "50.00"; 

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
            description: `Destaque de Logo na Página Principal - RealStock (${siteService?.name || "Logo na Página"})`,
          },
        ],
      }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
       console.error("PAYPAL ORDER ERROR:", orderData);
       throw new Error(`Falha ao criar ordem no PayPal: ${orderData.message || JSON.stringify(orderData)}`);
    }

    return NextResponse.json({
      success: true,
      paypal_order_id: orderData.id,
    });
  } catch (error: any) {
    console.error("PAYPAL LOGO ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
