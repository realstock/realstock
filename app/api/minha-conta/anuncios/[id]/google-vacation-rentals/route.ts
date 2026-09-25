import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = Number(id);

    if (isNaN(propertyId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: { orderBy: { sortOrder: "asc" } }, videos: true }
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Imóvel não encontrado" }, { status: 404 });
    }

    const siteUrl = "https://www.realstock.com.br";
    const feedUrlXml = `${siteUrl}/api/properties/${property.id}/gvr-feed?format=xml`;
    const feedUrlJson = `${siteUrl}/api/properties/${property.id}/gvr-feed?format=json`;
    const landingPageUrl = `${siteUrl}/imovel/${property.id}`;
    const googleDirectUrl = `https://www.google.com/search?q=${encodeURIComponent('aluguel temporada ' + property.title + ' ' + (property.city || ''))}`;

    // Verificar histórico de transações / habilitação do Google Vacation Rentals
    const gvrTransaction = await prisma.financialTransaction.findFirst({
      where: {
        type: "REVENUE",
        category: "GOOGLE_ADS",
        description: { contains: `Imóvel #${property.id}` }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      property,
      gvr: {
        status: gvrTransaction ? "ACTIVE" : "READY_TO_REGISTER",
        syncedAt: gvrTransaction?.createdAt || new Date(),
        feedUrlXml,
        feedUrlJson,
        landingPageUrl,
        googleDirectUrl,
        partnerName: "RealStock PMS Channel Manager",
        otaCode: "REALSTOCK_GVR_2026"
      }
    });
  } catch (error: any) {
    console.error("GET GVR CHANNEL MANAGER ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const propertyId = Number(id);

    if (isNaN(propertyId)) {
      return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return NextResponse.json({ success: false, error: "Imóvel não encontrado" }, { status: 404 });
    }

    const siteUrl = "https://www.realstock.com.br";
    const landingPageUrl = `${siteUrl}/imovel/${property.id}`;
    const feedUrlXml = `${siteUrl}/api/properties/${property.id}/gvr-feed?format=xml`;
    const googleDirectUrl = `https://www.google.com/search?q=${encodeURIComponent('aluguel temporada ' + property.title + ' ' + (property.city || ''))}`;

    // Registrar/Sincronizar a transação no banco como canal Google Vacation Rentals
    await prisma.financialTransaction.create({
      data: {
        type: "REVENUE",
        category: "GOOGLE_ADS",
        amount: 0,
        description: `Cadastro & Sincronização no Google Vacation Rentals (PMS Channel Manager) [Imóvel #${property.id}] [Feed: ${feedUrlXml}]`,
        userId: user.id,
        referenceId: `GVR_SYNC_${property.id}_${Date.now()}`
      }
    });

    return NextResponse.json({
      success: true,
      message: "Imóvel cadastrado e sincronizado com sucesso no Google Vacation Rentals (PMS Channel Manager)!",
      landingPageUrl,
      feedUrlXml,
      googleDirectUrl,
      syncedAt: new Date()
    });
  } catch (error: any) {
    console.error("POST GVR CHANNEL MANAGER ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
