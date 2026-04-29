import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // Verificação básica de admin (opcional, mas recomendado)
    const session = await getServerSession(authOptions);
    // Se quiser permitir sem login para facilitar o teste inicial:
    // if (!session || session.user?.role !== "ADMIN") {
    //   return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    // }

    console.log('--- API RESETTING OFFERS AND ACCOUNTING ---');

    // Executar resets
    const delOfferPayments = await prisma.offerPayment.deleteMany({});
    const delOffers = await prisma.offer.deleteMany({});
    const delTransactions = await prisma.financialTransaction.deleteMany({});
    
    // Outros resets de sessões
    await prisma.googleAdsSession.deleteMany({});
    await prisma.metaAdsSession.deleteMany({});
    await prisma.instagramPreviewSession.deleteMany({});
    await prisma.facebookFeedSession.deleteMany({});

    return NextResponse.json({ 
      success: true, 
      message: "Reset completo realizado com sucesso!",
      details: {
        offersDeleted: delOffers.count,
        paymentsDeleted: delOfferPayments.count,
        transactionsDeleted: delTransactions.count
      }
    });
  } catch (error: any) {
    console.error("RESET ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
