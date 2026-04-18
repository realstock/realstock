import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const now = new Date();
    const targetMonth = month ? parseInt(month) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 1); // first day of next month

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const isPaypalSandboxGlobal = process.env.PAYPAL_API_BASE?.includes("sandbox");

    const mappedTransactions: any[] = transactions.map(tx => ({
       ...tx,
       isSandbox: (tx.category === "PAYPAL_FEE" || tx.category === "ADS_BOOST" || (tx.description && tx.description.includes("PayPal"))) ? isPaypalSandboxGlobal : false
    }));

    let totalRevenue = 0;
    let totalExpense = 0;

    const breakdownRevenues: Record<string, number> = {
      SPONSOR: 0,
      OFFER: 0,
      POSTS: 0,
      ADS_BOOST: 0,
      OTHER: 0,
    };

    const breakdownExpenses: Record<string, number> = {
      PAYPAL_FEE: 0,
      META_ADS: 0,
      GOOGLE_ADS: 0,
      VERCEL: 0,
      SUPABASE: 0,
      OTHER: 0,
    };

    mappedTransactions.forEach((tx) => {
      const amount = Number(tx.amount);
      if (tx.type === "REVENUE") {
        totalRevenue += amount;
        breakdownRevenues[tx.category] = (breakdownRevenues[tx.category] || 0) + amount;
      } else {
        totalExpense += amount;
        breakdownExpenses[tx.category] = (breakdownExpenses[tx.category] || 0) + amount;
      }
    });

    // Virtual Expenses for Ad Campaigns
    // Regra: O usuário paga o total (Ex: R$ 70), o site fica com a taxa (Ex: R$ 10) e o restante vai para Meta/Google (Ex: R$ 60).
    const metaAds = await prisma.metaAdsSession.findMany({
       where: { createdAt: { gte: startDate, lt: endDate } }
    });
    
    metaAds.forEach(ad => {
       // O custo real na plataforma é o total pago menos a margem do site (Ex: 60/70 = ~0.857)
       const totalPaid = Number(ad.budget) * ad.budgetDays;
       const cost = totalPaid * (60 / 70); 
       totalExpense += cost;
       breakdownExpenses["META_ADS"] += cost;
       mappedTransactions.push({
          id: `virtual_meta_${ad.id}`,
          type: "EXPENSE",
          category: "META_ADS",
          amount: cost,
          description: `Gasto com Meta Ads (${ad.campaignId?.startsWith("MOCK") ? "Simulado" : "Real"})`,
          referenceId: ad.campaignId,
          createdAt: ad.createdAt,
          isSandbox: false
       });
    });

    const googleAds = await prisma.googleAdsSession.findMany({
       where: { createdAt: { gte: startDate, lt: endDate } }
    });

    googleAds.forEach(ad => {
       const totalPaid = Number(ad.budget) * ad.budgetDays;
       const cost = totalPaid * (60 / 70);
       totalExpense += cost;
       breakdownExpenses["GOOGLE_ADS"] += cost;
       mappedTransactions.push({
          id: `virtual_google_${ad.id}`,
          type: "EXPENSE",
          category: "GOOGLE_ADS",
          amount: cost,
          description: `Gasto com Google Ads (${ad.campaignId?.startsWith("MOCK") ? "Simulado" : "Real"})`,
          referenceId: ad.campaignId,
          createdAt: ad.createdAt,
          isSandbox: false
       });
    });
    
    mappedTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      period: { month: targetMonth, year: targetYear },
      summary: {
        totalRevenue,
        totalExpense,
        netProfit: totalRevenue - totalExpense,
      },
      breakdowns: {
        revenues: breakdownRevenues,
        expenses: breakdownExpenses,
      },
      transactions: mappedTransactions,
    });
  } catch (error: any) {
    console.error("GET ACCOUNTING ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro interno no servidor." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { type, category, amount, description } = await req.json();

    if (!type || !category || !amount) {
      return NextResponse.json({ success: false, error: "Dados incompletos." }, { status: 400 });
    }

    const transaction = await prisma.financialTransaction.create({
      data: {
        type,
        category,
        amount: parseFloat(amount),
        description: description || "",
      },
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    console.error("POST ACCOUNTING ERROR:", error);
    return NextResponse.json({ success: false, error: "Erro ao salvar transação." }, { status: 500 });
  }
}
