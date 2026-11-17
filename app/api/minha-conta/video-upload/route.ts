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
    const contentType = req.headers.get("content-type") || "";

    // 1. FLUXO A: Requisição JSON (Direct Upload para contornar limite de 4.5MB da Vercel)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const action = body.action;
      const propertyId = Number(body.propertyId);

      if (propertyId === undefined || isNaN(propertyId)) {
        return NextResponse.json({ success: false, error: "propertyId inválido" }, { status: 400 });
      }

      // SUB-AÇÃO 1: Gerar URL assinada de upload direto para o Supabase Storage
      if (action === "sign-url") {
        const extension = body.extension === "mp4" ? "mp4" : "webm";
        const filePath = `reels/${propertyId}-${Date.now()}.${extension}`;

        const { data, error } = await supabaseAdmin.storage
          .from("property-images")
          .createSignedUploadUrl(filePath);

        if (error || !data) {
          console.error("Erro ao gerar signed URL do Supabase:", error);
          return NextResponse.json({ success: false, error: error?.message || "Erro no storage" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          signedUrl: data.signedUrl,
          token: data.token,
          filePath,
        });
      }

      // SUB-AÇÃO 2: Concluir upload após envio bem-sucedido diretamente ao Supabase
      if (action === "complete") {
        const filePath = body.filePath;
        const orderID = body.orderID || "FREE";

        if (!filePath) {
          return NextResponse.json({ success: false, error: "filePath ausente" }, { status: 400 });
        }

        let finalOrderID = orderID;
        let finalFeeValue = 0;

        if (orderID === "CREDIT") {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (!user || user.viralizarCredits < 1) {
            return NextResponse.json({ success: false, error: "Saldo de créditos insuficiente" }, { status: 400 });
          }
          await prisma.user.update({
            where: { id: userId },
            data: { viralizarCredits: { decrement: 1 } },
          });
          finalOrderID = "CREDIT_USAGE";
          finalFeeValue = 0;
        } else if (orderID && orderID !== "FREE") {
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

          const siteService = await prisma.siteService.findFirst({
            where: { slug: "reels" },
            include: { fee: true },
          });
          finalFeeValue = siteService?.fee?.value ? Number(siteService.fee.value) : 29.90;
        } else {
          finalOrderID = "FREE";
          finalFeeValue = 0;
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("property-images")
          .getPublicUrl(filePath);

        const updateAction = Number(propertyId) === 0 
          ? prisma.user.update({
              where: { id: userId },
              data: {
                portfolioVideoUrl: publicUrlData.publicUrl,
                portfolioVideoPaidAt: new Date(),
              },
            })
          : prisma.property.update({
              where: { id: Number(propertyId), ownerId: userId },
              data: {
                reelsVideoUrl: publicUrlData.publicUrl,
                reelsVideoPaidAt: new Date(),
              },
            });

        await prisma.$transaction([
          updateAction,
          prisma.financialTransaction.create({
            data: {
              type: "REVENUE",
              category: "REELS_VIDEO",
              amount: finalFeeValue,
              description: Number(propertyId) === 0 
                ? `Taxa de Criação/Incorporação Reels - Portfólio`
                : `Taxa de Criação/Incorporação Reels - Imóvel ${propertyId}`,
              referenceId: finalOrderID,
              userId: userId,
            },
          }),
        ]);

        return NextResponse.json({ success: true, videoUrl: publicUrlData.publicUrl });
      }

      return NextResponse.json({ success: false, error: "Ação não reconhecida" }, { status: 400 });
    }

    // 2. FLUXO B: Multipart FormData (Legado / Fallback para arquivos pequenos)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const orderID = (formData.get("orderID") as string) || "FREE";
    const propertyIdRaw = formData.get("propertyId");
    const propertyId = Number(propertyIdRaw);

    if (!file || propertyIdRaw === null || isNaN(propertyId)) {
      return NextResponse.json({ success: false, error: "Dados ausentes" }, { status: 400 });
    }

    console.log("UPLOAD START:", { name: file.name, size: file.size, type: file.type, propertyId });

    let finalOrderID = orderID;
    let finalFeeValue = 0;

    if (orderID === "CREDIT") {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.viralizarCredits < 1) {
            return NextResponse.json({ success: false, error: "Saldo de créditos insuficiente" }, { status: 400 });
        }
        await prisma.user.update({
            where: { id: userId },
            data: { viralizarCredits: { decrement: 1 } }
        });
        finalOrderID = "CREDIT_USAGE";
        finalFeeValue = 0;
    } else if (orderID && orderID !== "FREE") {
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

        const siteService = await prisma.siteService.findFirst({
            where: { slug: "reels" },
            include: { fee: true }
        });
        finalFeeValue = siteService?.fee?.value ? Number(siteService.fee.value) : 29.90;
    } else {
        finalOrderID = "FREE";
        finalFeeValue = 0;
    }

    // 2. Upload do Vídeo para Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Identificar extensão correta baseada no tipo do arquivo
    const extension = file.type === 'video/mp4' ? 'mp4' : 'webm';
    const fileName = `reels/${propertyId}-${Date.now()}.${extension}`;
    const filePath = fileName;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("property-images") // Usando o bucket existente
      .upload(filePath, buffer, { contentType: file.type || "video/webm" });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("property-images")
      .getPublicUrl(filePath);

    // 3. Atualizar Imóvel ou Usuário e Criar Transação Financeira
    const updateAction = Number(propertyId) === 0 
      ? prisma.user.update({
          where: { id: userId },
          data: {
            portfolioVideoUrl: publicUrlData.publicUrl,
            portfolioVideoPaidAt: new Date(),
          },
        })
      : prisma.property.update({
          where: { id: Number(propertyId), ownerId: userId },
          data: {
            reelsVideoUrl: publicUrlData.publicUrl,
            reelsVideoPaidAt: new Date(),
          },
        });

    await prisma.$transaction([
      updateAction,
      prisma.financialTransaction.create({
        data: {
          type: "REVENUE",
          category: "REELS_VIDEO",
          amount: finalFeeValue,
          description: Number(propertyId) === 0 
            ? `Taxa de Criação/Incorporação Reels - Portfólio`
            : `Taxa de Criação/Incorporação Reels - Imóvel ${propertyId}`,
          referenceId: finalOrderID,
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
