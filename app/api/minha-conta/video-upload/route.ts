import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderID = formData.get("orderID") as string;
    const propertyId = Number(formData.get("propertyId"));

    if (!file || !orderID || !propertyId) {
      return NextResponse.json({ success: false, error: "Dados ausentes" }, { status: 400 });
    }

    // 1. Capturar Pagamento no PayPal
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const base = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      body: "grant_type=client_credentials",
      headers: { Authorization: `Basic ${auth}` },
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const captureData = await captureRes.json();

    if (captureData.status !== "COMPLETED") {
       return NextResponse.json({ success: false, error: "Pagamento não concluído no PayPal" }, { status: 400 });
    }

    // 2. Upload do Vídeo para Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `reels/${propertyId}-${Date.now()}.webm`;
    const filePath = fileName;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images") // Usando o bucket existente
      .upload(filePath, buffer, { contentType: "video/webm" });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("property-images")
      .getPublicUrl(filePath);

    // 3. Atualizar Imóvel e Criar Transação Financeira
    const siteService = await prisma.siteService.findFirst({
      where: { slug: "reels" },
      include: { fee: true }
    });
    const finalFee = siteService?.fee?.value ? Number(siteService.fee.value) : 29.90;

    await prisma.$transaction([
      prisma.property.update({
        where: { id: propertyId, ownerId: userId },
        data: {
          reelsVideoUrl: publicUrlData.publicUrl,
          reelsVideoPaidAt: new Date(),
        },
      }),
      prisma.financialTransaction.create({
        data: {
          type: "REVENUE",
          category: "REELS_VIDEO",
          amount: finalFee,
          description: `Taxa de Criação/Incorporação Reels - Imóvel ${propertyId}`,
          referenceId: orderID,
          userId: userId,
        },
      }),
    ]);

    return NextResponse.json({ success: true, videoUrl: publicUrlData.publicUrl });
  } catch (error: any) {
    console.error("REELS UPLOAD ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
