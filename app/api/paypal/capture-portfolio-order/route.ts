import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  if (!res.ok) throw new Error("Falha ao autenticar no PayPal.");
  return data.access_token as string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { orderID, selectedPropertyIds } = await req.json();

    if (!orderID || !Array.isArray(selectedPropertyIds) || selectedPropertyIds.length === 0) {
      return NextResponse.json({ success: false, error: "Parâmetros inválidos ou nenhum imóvel selecionado." }, { status: 400 });
    }

    if (selectedPropertyIds.length > 10) {
      return NextResponse.json({ success: false, error: "O limite do Instagram é de 10 fotos por carrossel." }, { status: 400 });
    }

    // Capture payment
    const accessToken = await getPayPalAccessToken();
    const base = process.env.PAYPAL_API_BASE!;
    const captureRes = await fetch(`${base}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }
    });

    const captureData = await captureRes.json();
    if (captureData.status !== "COMPLETED") {
      return NextResponse.json({ success: false, error: "Pagamento não concluído." }, { status: 400 });
    }

    // Accounting Logic
    try {
        const captureInfo = captureData.purchase_units?.[0]?.payments?.captures?.[0];
        if (captureInfo && captureInfo.seller_receivable_breakdown) {
            const grossAmount = parseFloat(captureInfo.seller_receivable_breakdown.gross_amount.value);
            const feeAmount = parseFloat(captureInfo.seller_receivable_breakdown.paypal_fee.value);

            await prisma.financialTransaction.createMany({
                data: [
                    {
                        type: "REVENUE",
                        category: "POSTS",
                        amount: grossAmount,
                        description: `Publicação de Portfólio (Instagram)`,
                        referenceId: orderID,
                    },
                    {
                        type: "EXPENSE",
                        category: "PAYPAL_FEE",
                        amount: feeAmount,
                        description: `Tarifa PayPal (Portfólio Insta)`,
                        referenceId: orderID,
                    }
                ]
            });
        }
    } catch (finErr) {
        console.error("FINANCE LOGGING ERROR:", finErr);
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ success: false, error: "Usuário não encontrado." }, { status: 404 });

    const properties = await prisma.property.findMany({
      where: { 
         ownerId: user.id,
         id: { in: selectedPropertyIds.map(Number) }
      },
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    });

    const propertiesWithImages = properties.filter(p => p.images && p.images.length > 0);

    if (propertiesWithImages.length === 0) {
        return NextResponse.json({ success: false, error: "Nenhum anúncio com foto encontrado para o portfólio." }, { status: 400 });
    }

    const igUserId = process.env.INSTAGRAM_IG_USER_ID;
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!igUserId || !igToken) {
      return NextResponse.json({ success: false, error: "Credenciais do Instagram não configuradas." }, { status: 500 });
    }

    const caption = `🌟 Conheça nosso Portfólio de Imóveis!\n\nConfira as novidades e melhores oportunidades passando para o lado 👉\n\nEntre em contato ou acesse nosso site para mais detalhes de cada imóvel!`;

    let finalMediaId = null;

    if (propertiesWithImages.length === 1) {
       const createMediaRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(propertiesWithImages[0].images[0].imageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, { method: "POST" });
       const mediaData = await createMediaRes.json();
       if (!createMediaRes.ok || !mediaData.id) return NextResponse.json({ success: false, error: "Erro ao criar mídia." }, { status: 500 });
       finalMediaId = mediaData.id;
    } else {
       const childrenIds: string[] = [];
       try {
           const uploadPromises = propertiesWithImages.map(async (prop) => {
               const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?image_url=${encodeURIComponent(prop.images[0].imageUrl)}&is_carousel_item=true&access_token=${igToken}`, { method: "POST" });
               const data = await res.json();
               if (!res.ok || !data.id) throw new Error(data.error?.message || "Erro desconhecido ao upar item.");
               return data.id;
           });
           
           const ids = await Promise.all(uploadPromises);
           childrenIds.push(...ids);
       } catch (err: any) {
           return NextResponse.json({ success: false, error: "Erro ao upar itens do carrossel: " + err.message }, { status: 500 });
       }

       const createCarouselRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media?media_type=CAROUSEL&children=${childrenIds.join(',')}&caption=${encodeURIComponent(caption)}&access_token=${igToken}`, { method: "POST" });
       const carouselData = await createCarouselRes.json();
       if (!createCarouselRes.ok || !carouselData.id) return NextResponse.json({ success: false, error: "Erro ao criar carrossel." }, { status: 500 });
       finalMediaId = carouselData.id;
    }

    const publishRes = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/media_publish?creation_id=${finalMediaId}&access_token=${igToken}`, { method: "POST" });
    const publishData = await publishRes.json();
    if (!publishRes.ok || !publishData.id) return NextResponse.json({ success: false, error: "Erro ao publicar." }, { status: 500 });

    let permalink = "";
    try {
        const pRes = await fetch(`https://graph.facebook.com/v19.0/${publishData.id}?fields=permalink&access_token=${igToken}`);
        const pData = await pRes.json();
        if (pData.permalink) permalink = pData.permalink;
    } catch(err) {}

    await prisma.instagramPreviewSession.create({
       data: {
         listingId: 0, // 0 = PORTFOLIO
         status: "PUBLISHED",
         publishedMediaId: publishData.id,
         allImageUrls: [],
         selectedImages: [],
         validationReport: { permalink, isPortfolio: true },
         caption: caption,
       }
    });

    return NextResponse.json({ success: true, message: "Portfólio publicado!" });
  } catch (error: any) {
    console.error("PAYPAL CAPTURE PORTFOLIO ORDER ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno." }, { status: 500 });
  }
}
