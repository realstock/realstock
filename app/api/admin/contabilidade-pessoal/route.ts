import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito para administradores." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const { searchParams } = new URL(req.url);

    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");
    const sourceType = searchParams.get("sourceType"); // "ALL" | "BANK_STATEMENT" | "CREDIT_CARD"
    const category = searchParams.get("category");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const now = new Date();
    const targetMonth = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;
    const targetYear = yearStr ? parseInt(yearStr, 10) : now.getFullYear();

    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0)); // primeiro dia do mês seguinte

    // Busca transações do usuário no mês por data contábil ou por mês de competência da fatura
    const whereClause: any = {
      userId,
      OR: [
        {
          date: {
            gte: startDate,
            lt: endDate,
          },
        },
        {
          competenceMonth: targetMonth,
          competenceYear: targetYear,
        },
      ],
    };

    if (sourceType && sourceType !== "ALL") {
      whereClause.sourceType = sourceType;
    }

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { accountName: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [transactions, uploads] = await Promise.all([
      prisma.personalTransaction.findMany({
        where: whereClause,
        orderBy: { date: "desc" },
      }),
      prisma.personalUpload.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // Calcula resumos e métricas
    let totalIncome = 0;
    let totalCreditCardExpenses = 0;
    let totalBankExpenses = 0;
    let totalCardInvoicePayments = 0; // pagamentos da fatura identificados no extrato

    const categoryMap: Record<string, { amount: number; count: number }> = {};
    const accountMap: Record<string, { amount: number; count: number; type: string }> = {};

    transactions.forEach((tx) => {
      const amt = Number(tx.amount);
      if (tx.type === "INCOME") {
        totalIncome += amt;
      } else {
        if (tx.sourceType === "CREDIT_CARD") {
          totalCreditCardExpenses += amt;
        } else {
          totalBankExpenses += amt;
          if (tx.category === "Fatura de Cartão") {
            totalCardInvoicePayments += amt;
          }
        }

        // Agrupa por categoria (apenas despesas)
        if (!categoryMap[tx.category]) {
          categoryMap[tx.category] = { amount: 0, count: 0 };
        }
        categoryMap[tx.category].amount += amt;
        categoryMap[tx.category].count += 1;
      }

      // Agrupa por conta/cartão
      const accKey = tx.accountName || "Principal";
      if (!accountMap[accKey]) {
        accountMap[accKey] = { amount: 0, count: 0, type: tx.sourceType };
      }
      accountMap[accKey].amount += amt;
      accountMap[accKey].count += 1;
    });

    // Total de despesas reais:
    // Se o usuário importou Extrato + Cartão, despesas de "Fatura de Cartão" no extrato
    // representam o pagamento das despesas do cartão.
    // Para não haver contagem dupla, deduzimos totalCardInvoicePayments se houver lançamentos de cartão
    const hasCardExpenses = totalCreditCardExpenses > 0;
    const effectiveExpenses = hasCardExpenses
      ? Number((totalCreditCardExpenses + (totalBankExpenses - totalCardInvoicePayments)).toFixed(2))
      : Number((totalBankExpenses + totalCreditCardExpenses).toFixed(2));

    const netBalance = Number((totalIncome - effectiveExpenses).toFixed(2));
    const savingsRate = totalIncome > 0 ? Number(((netBalance / totalIncome) * 100).toFixed(1)) : 0;

    // Converte categoryMap em array ordenado decrescente
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([cat, val]) => ({
        category: cat,
        amount: Number(val.amount.toFixed(2)),
        count: val.count,
        percentage: effectiveExpenses > 0 ? Number(((val.amount / effectiveExpenses) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Top 5 maiores despesas
    const topExpenses = transactions
      .filter((tx) => tx.type === "EXPENSE" && tx.category !== "Fatura de Cartão")
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: Number(tx.amount),
        date: tx.date,
        category: tx.category,
        accountName: tx.accountName,
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: effectiveExpenses,
        totalCreditCardExpenses: Number(totalCreditCardExpenses.toFixed(2)),
        totalBankExpenses: Number(totalBankExpenses.toFixed(2)),
        totalCardInvoicePayments: Number(totalCardInvoicePayments.toFixed(2)),
        netBalance,
        savingsRate,
        transactionsCount: transactions.length,
      },
      categoryBreakdown,
      accountBreakdown: Object.entries(accountMap).map(([acc, data]) => ({
        accountName: acc,
        amount: Number(data.amount.toFixed(2)),
        count: data.count,
        sourceType: data.type,
      })),
      topExpenses,
      recentUploads: uploads,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        purchaseDate: tx.purchaseDate,
        competenceMonth: tx.competenceMonth,
        competenceYear: tx.competenceYear,
        description: tx.description,
        amount: Number(tx.amount),
        type: tx.type,
        category: tx.category,
        accountName: tx.accountName,
        sourceType: tx.sourceType,
        installment: tx.installment,
        rawText: tx.rawText,
        uploadId: tx.uploadId,
      })),
    });
  } catch (error: any) {
    console.error("GET Contabilidade Pessoal Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao consultar contabilidade pessoal." },
      { status: 500 }
    );
  }
}
