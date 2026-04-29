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
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { orderID, propertyId } = await req.json();

    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (data.status === "COMPLETED") {
      const user = await prisma.user.findUnique({ where: { email: session.user.email } });
      if (!user) throw new Error("Usuário não encontrado");

      const amount = parseFloat(data.purchase_units[0].payments.captures[0].amount.value);

      // Registrar transação
      await prisma.financialTransaction.create({
        data: {
          type: "REVENUE",
          category: "ADS_BOOST",
          amount: amount,
          description: `Pacote Viralizar - ${propertyId === 0 ? 'Portfólio' : 'Imóvel ' + propertyId}`,
          userId: user.id,
          referenceId: orderID
        }
      });

      return NextResponse.json({ success: true, capture: data });
    }

    return NextResponse.json({ success: false, error: "Pagamento não completado" }, { status: 400 });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE VIRALIZAR ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
