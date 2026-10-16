import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncLoanAbatement } from "@/lib/personal-accounting/loanTracker";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito para administradores." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);

    // 1. Apuração Automática de Caixa e Cartão (Janeiro a Setembro / 2026)
    const allTxs = await prisma.personalTransaction.findMany({
      where: {
        userId,
        competenceYear: 2026,
        competenceMonth: { gte: 1, lte: 9 },
      },
    });

    const bankTxs = allTxs.filter((t) => t.sourceType === "BANK_STATEMENT");
    const cardTxs = allTxs.filter((t) => t.sourceType === "CREDIT_CARD");

    const totalBankIncome = bankTxs
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalBankExpenses = bankTxs
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalCardExpenses = cardTxs
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalCardInvoiceInBank = bankTxs
      .filter((t) => t.type === "EXPENSE" && t.category === "Fatura de Cartão")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Despesas Reais Reconciliadas:
    const totalEffectiveExpenses = (totalBankExpenses - totalCardInvoiceInBank) + totalCardExpenses;
    const accumulatedCash = Number((totalBankIncome - totalEffectiveExpenses).toFixed(2));

    // Fatura recente do Cartão de Crédito (Setembro / 2026)
    const sepCardTxs = cardTxs.filter((t) => t.competenceMonth === 9 && t.type === "EXPENSE");
    const latestCardInvoiceAmount = Number(
      sepCardTxs.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)
    );

    // Sincroniza abatimento contínuo do empréstimo de curto prazo (R$ 5.691,46)
    const loanTracker = await syncLoanAbatement(userId);

    // 2. Busca itens salvos do Balanço Patrimonial
    let items = await prisma.personalBalanceItem.findMany({
      where: { userId },
      orderBy: [{ subgroup: "asc" }, { createdAt: "asc" }],
    });

    // Se o usuário ainda não tiver itens no balanço, cria a estrutura inicial padrão
    if (items.length === 0) {
      const defaultItems = [
        // ATIVOS CIRCULANTES
        {
          userId,
          type: "ASSET",
          subgroup: "CIRCULANTE",
          category: "CAIXA_BANCOS",
          title: "Disponibilidades em Caixa / Bancos",
          institution: "Banco do Brasil (Conta Corrente)",
          value: accumulatedCash > 0 ? accumulatedCash : 17879.20,
          notes: "Saldo apurado no período de Janeiro a Setembro de 2026.",
          isAutoCalculated: true,
        },
        {
          userId,
          type: "ASSET",
          subgroup: "CIRCULANTE",
          category: "APLICACOES_LIQUIDEZ",
          title: "Reserva de Emergência / Renda Fixa",
          institution: "Banco do Brasil / Corretora",
          value: 0,
          notes: "Aplicações de resgate diário / CDI.",
          isAutoCalculated: false,
        },
        {
          userId,
          type: "ASSET",
          subgroup: "CIRCULANTE",
          category: "OUTROS_BENS",
          title: "Outros Créditos a Receber (Curto Prazo)",
          institution: "Diversos",
          value: 0,
          notes: "Valores a receber nos próximos meses.",
          isAutoCalculated: false,
        },

        // ATIVOS NÃO CIRCULANTES
        {
          userId,
          type: "ASSET",
          subgroup: "NAO_CIRCULANTE",
          category: "IMOVEIS",
          title: "Imóveis Residenciais / Comerciais",
          institution: "Patrimônio Próprio",
          value: 0,
          notes: "Valor venal ou de mercado de apartamentos, casas ou terrenos.",
          isAutoCalculated: false,
        },
        {
          userId,
          type: "ASSET",
          subgroup: "NAO_CIRCULANTE",
          category: "VEICULOS",
          title: "Veículos Automotores (Tabela FIPE)",
          institution: "Garagem",
          value: 0,
          notes: "Automóveis, motos ou outros veículos.",
          isAutoCalculated: false,
        },
        {
          userId,
          type: "ASSET",
          subgroup: "NAO_CIRCULANTE",
          category: "INVESTIMENTOS_LP",
          title: "Investimentos & Mercado de Capitais (Ações / FIIs)",
          institution: "Corretora de Valores",
          value: 0,
          notes: "Posição em bolsa, fundos imobiliários, previdência privada ou cripto.",
          isAutoCalculated: false,
        },
        {
          userId,
          type: "ASSET",
          subgroup: "NAO_CIRCULANTE",
          category: "PARTICIPACOES",
          title: "Participações Societárias (RealStock / Empresas)",
          institution: "Quotas / Ações Empresariais",
          value: 0,
          notes: "Participação patrimonial e cotas em negócios.",
          isAutoCalculated: false,
        },

        // PASSIVOS CIRCULANTES
        {
          userId,
          type: "LIABILITY",
          subgroup: "CIRCULANTE",
          category: "CARTOES_CREDITO",
          title: "Fatura Cartão de Crédito Altus Visa (Set/26)",
          institution: "Banco do Brasil",
          value: latestCardInvoiceAmount > 0 ? latestCardInvoiceAmount : 41549.11,
          notes: "Fatura de Setembro/2026 apurada no extrato de cartão.",
          isAutoCalculated: true,
        },
        {
          userId,
          type: "LIABILITY",
          subgroup: "CIRCULANTE",
          category: "CONTAS_PAGAR",
          title: "Contas a Pagar & Obrigações Imediatas",
          institution: "Diversos",
          value: 0,
          notes: "Despesas fixas ou parcelamentos com vencimento próximo.",
          isAutoCalculated: false,
        },

        // PASSIVOS NÃO CIRCULANTES
        {
          userId,
          type: "LIABILITY",
          subgroup: "NAO_CIRCULANTE",
          category: "FINANCIAMENTOS",
          title: "Financiamentos Imobiliários (Saldo Devedor)",
          institution: "Banco Financiador",
          value: 0,
          notes: "Saldo devedor de financiamentos de imóveis.",
          isAutoCalculated: false,
        },
        {
          userId,
          type: "LIABILITY",
          subgroup: "NAO_CIRCULANTE",
          category: "FINANCIAMENTOS",
          title: "Financiamentos de Veículos (Saldo Devedor)",
          institution: "Banco Financiador",
          value: 0,
          notes: "Saldo devedor de parcelas futuras de veículos.",
          isAutoCalculated: false,
        },
        {
          userId,
          type: "LIABILITY",
          subgroup: "NAO_CIRCULANTE",
          category: "EMPRESTIMOS",
          title: "Empréstimos Bancários / Consórcios",
          institution: "Instituição Financeira",
          value: 0,
          notes: "Saldo a amortizar de empréstimos e contratos.",
          isAutoCalculated: false,
        },
      ];

      await prisma.personalBalanceItem.createMany({
        data: defaultItems,
      });

      items = await prisma.personalBalanceItem.findMany({
        where: { userId },
        orderBy: [{ subgroup: "asc" }, { createdAt: "asc" }],
      });
    }

    // 3. Cálculos de Totais e Índices
    let totalCirculatingAssets = 0;
    let totalNonCirculatingAssets = 0;
    let totalCirculatingLiabilities = 0;
    let totalNonCirculatingLiabilities = 0;

    items.forEach((item) => {
      const val = Number(item.value);
      if (item.type === "ASSET") {
        if (item.subgroup === "CIRCULANTE") {
          totalCirculatingAssets += val;
        } else {
          totalNonCirculatingAssets += val;
        }
      } else if (item.type === "LIABILITY") {
        if (item.subgroup === "CIRCULANTE") {
          totalCirculatingLiabilities += val;
        } else {
          totalNonCirculatingLiabilities += val;
        }
      }
    });

    const totalAssets = Number((totalCirculatingAssets + totalNonCirculatingAssets).toFixed(2));
    const totalLiabilities = Number((totalCirculatingLiabilities + totalNonCirculatingLiabilities).toFixed(2));
    const netWorth = Number((totalAssets - totalLiabilities).toFixed(2));

    const liquidityRatio =
      totalCirculatingLiabilities > 0
        ? Number((totalCirculatingAssets / totalCirculatingLiabilities).toFixed(2))
        : totalCirculatingAssets > 0
        ? 999
        : 0;

    const debtRatio =
      totalAssets > 0 ? Number(((totalLiabilities / totalAssets) * 100).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      items,
      summary: {
        totalAssets,
        totalCirculatingAssets: Number(totalCirculatingAssets.toFixed(2)),
        totalNonCirculatingAssets: Number(totalNonCirculatingAssets.toFixed(2)),
        totalLiabilities,
        totalCirculatingLiabilities: Number(totalCirculatingLiabilities.toFixed(2)),
        totalNonCirculatingLiabilities: Number(totalNonCirculatingLiabilities.toFixed(2)),
        netWorth,
        liquidityRatio,
        debtRatio,
      },
      autoCalculated: {
        accumulatedCash,
        totalBankIncome: Number(totalBankIncome.toFixed(2)),
        totalEffectiveExpenses: Number(totalEffectiveExpenses.toFixed(2)),
        latestCardInvoiceAmount,
      },
      loanTracker,
    });
  } catch (error: any) {
    console.error("Erro ao carregar Balanço Patrimonial:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await req.json();

    const { id, type, subgroup, category, title, institution, value, notes, referenceDate } = body;

    if (!type || !subgroup || !title) {
      return NextResponse.json({ success: false, error: "Campos obrigatórios ausentes." }, { status: 400 });
    }

    const numValue = parseFloat(String(value).replace(",", ".")) || 0;

    if (id) {
      // Atualiza item existente
      const updated = await prisma.personalBalanceItem.update({
        where: { id, userId },
        data: {
          type,
          subgroup,
          category: category || "OUTROS_BENS",
          title,
          institution: institution || null,
          value: numValue,
          notes: notes || null,
          referenceDate: referenceDate ? new Date(referenceDate) : undefined,
        },
      });
      return NextResponse.json({ success: true, item: updated });
    } else {
      // Cria novo item
      const created = await prisma.personalBalanceItem.create({
        data: {
          userId,
          type,
          subgroup,
          category: category || "OUTROS_BENS",
          title,
          institution: institution || null,
          value: numValue,
          notes: notes || null,
          isAutoCalculated: false,
          referenceDate: referenceDate ? new Date(referenceDate) : new Date(),
        },
      });
      return NextResponse.json({ success: true, item: created });
    }
  } catch (error: any) {
    console.error("Erro ao salvar item do balanço:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await req.json();

    // Se for ação de sincronizar valores automáticos
    if (body.action === "SYNC_AUTO") {
      const allTxs = await prisma.personalTransaction.findMany({
        where: {
          userId,
          competenceYear: 2026,
          competenceMonth: { gte: 1, lte: 9 },
        },
      });

      const bankTxs = allTxs.filter((t) => t.sourceType === "BANK_STATEMENT");
      const cardTxs = allTxs.filter((t) => t.sourceType === "CREDIT_CARD");

      const totalBankIncome = bankTxs
        .filter((t) => t.type === "INCOME")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalBankExpenses = bankTxs
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalCardExpenses = cardTxs
        .filter((t) => t.type === "EXPENSE")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalCardInvoiceInBank = bankTxs
        .filter((t) => t.type === "EXPENSE" && t.category === "Fatura de Cartão")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalEffectiveExpenses = (totalBankExpenses - totalCardInvoiceInBank) + totalCardExpenses;
      const accumulatedCash = Number((totalBankIncome - totalEffectiveExpenses).toFixed(2));

      const sepCardTxs = cardTxs.filter((t) => t.competenceMonth === 9 && t.type === "EXPENSE");
      const latestCardInvoiceAmount = Number(
        sepCardTxs.reduce((sum, t) => sum + Number(t.amount), 0).toFixed(2)
      );

      // Atualiza os itens automáticos
      await prisma.personalBalanceItem.updateMany({
        where: { userId, category: "CAIXA_BANCOS", isAutoCalculated: true },
        data: { value: accumulatedCash },
      });

      await prisma.personalBalanceItem.updateMany({
        where: { userId, category: "CARTOES_CREDITO", isAutoCalculated: true },
        data: { value: latestCardInvoiceAmount },
      });

      // Sincroniza também abatimento do empréstimo
      const loanTracker = await syncLoanAbatement(userId);

      return NextResponse.json({
        success: true,
        message: "Valores automáticos e empréstimo sincronizados com sucesso.",
        loanTracker,
      });
    }

    // Atualização em lote de itens (array de { id, value })
    if (Array.isArray(body.items)) {
      for (const item of body.items) {
        if (!item.id) continue;
        const numVal = parseFloat(String(item.value).replace(",", ".")) || 0;
        await prisma.personalBalanceItem.update({
          where: { id: item.id, userId },
          data: {
            value: numVal,
            ...(item.title ? { title: item.title } : {}),
            ...(item.institution !== undefined ? { institution: item.institution } : {}),
            ...(item.notes !== undefined ? { notes: item.notes } : {}),
          },
        });
      }
      return NextResponse.json({ success: true, message: "Itens atualizados com sucesso." });
    }

    return NextResponse.json({ success: false, error: "Ação não especificada." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro na atualização em lote do balanço:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID não fornecido." }, { status: 400 });
    }

    await prisma.personalBalanceItem.delete({
      where: { id, userId },
    });

    return NextResponse.json({ success: true, message: "Item excluído com sucesso." });
  } catch (error: any) {
    console.error("Erro ao excluir item do balanço:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}
