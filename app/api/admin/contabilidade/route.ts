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

    transactions.forEach((tx) => {
      const amount = Number(tx.amount);
      if (tx.type === "REVENUE") {
        totalRevenue += amount;
        breakdownRevenues[tx.category] = (breakdownRevenues[tx.category] || 0) + amount;
      } else {
        totalExpense += amount;
        breakdownExpenses[tx.category] = (breakdownExpenses[tx.category] || 0) + amount;
      }
    });

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
      transactions,
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
