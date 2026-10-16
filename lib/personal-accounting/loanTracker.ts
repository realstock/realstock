import { prisma } from "@/lib/prisma";

export const LOAN_CONFIG = {
  TITLE_PREFIX: "Empréstimo Curto Prazo",
  CATEGORY: "EMPRESTIMOS",
  BASE_INSTALLMENTS: 50,
  INSTALLMENT_VALUE: 5691.46,
  TOTAL_BASE_VALUE: 50 * 5691.46, // 284.573,00
  START_MONTH: 10, // Rastreamento a partir de Outubro/2026
  START_YEAR: 2026,
};

export interface LoanAbatementResult {
  baseInstallments: number;
  paidCount: number;
  remainingInstallments: number;
  remainingDebt: number;
  totalAmortized: number;
  detectedTransactions: Array<{
    id: string;
    date: Date;
    amount: number;
    description: string;
    sourceType: string;
    competenceMonth: number | null;
  }>;
}

/**
 * Detecta pagamentos da parcela do empréstimo (R$ 5.691,46) nos extratos e faturas
 * e abate automaticamente o saldo devedor e a contagem de parcelas restantes no Balanço Patrimonial.
 */
export async function syncLoanAbatement(userId: number): Promise<LoanAbatementResult> {
  // 1. Busca todas as transações de saída compatíveis com o valor da parcela (R$ 5.691,46 com margem de centavos/IOF)
  // que ocorreram a partir do início do rastreamento (Outubro/2026 em diante)
  const candidateTxs = await prisma.personalTransaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      OR: [
        {
          amount: {
            gte: LOAN_CONFIG.INSTALLMENT_VALUE - 2.0,
            lte: LOAN_CONFIG.INSTALLMENT_VALUE + 2.0,
          },
        },
        {
          description: {
            contains: "5691",
          },
        },
      ],
    },
    orderBy: { date: "asc" },
  });

  // Filtra apenas pagamentos a partir de Outubro/2026 (ou sem competência definida mas com data >= 01/10/2026)
  const oct1st2026 = new Date(Date.UTC(2026, 9, 1, 0, 0, 0));
  const validPaymentTxs = candidateTxs.filter((tx) => {
    if (tx.competenceYear && tx.competenceMonth) {
      if (tx.competenceYear > 2026) return true;
      if (tx.competenceYear === 2026 && tx.competenceMonth >= LOAN_CONFIG.START_MONTH) return true;
      return false;
    }
    return new Date(tx.date) >= oct1st2026;
  });

  const paidCount = validPaymentTxs.length;
  const remainingInstallments = Math.max(0, LOAN_CONFIG.BASE_INSTALLMENTS - paidCount);
  const remainingDebt = Number((remainingInstallments * LOAN_CONFIG.INSTALLMENT_VALUE).toFixed(2));
  const totalAmortized = Number((paidCount * LOAN_CONFIG.INSTALLMENT_VALUE).toFixed(2));

  // 2. Garante que essas transações estejam categorizadas como "Empréstimos"
  for (const pTx of validPaymentTxs) {
    if (pTx.category !== "Empréstimos") {
      await prisma.personalTransaction.update({
        where: { id: pTx.id },
        data: { category: "Empréstimos" },
      });
    }
  }

  // 3. Atualiza ou cria o item no Balanço Patrimonial (PersonalBalanceItem)
  const existingItem = await prisma.personalBalanceItem.findFirst({
    where: {
      userId,
      type: "LIABILITY",
      category: LOAN_CONFIG.CATEGORY,
      title: { contains: "5691" },
    },
  });

  const title = `${LOAN_CONFIG.TITLE_PREFIX} (${remainingInstallments} parcelas de R$ 5.691,46)`;
  const notes =
    paidCount > 0
      ? `Original: ${LOAN_CONFIG.BASE_INSTALLMENTS} parcelas (R$ ${LOAN_CONFIG.TOTAL_BASE_VALUE.toFixed(2)}). ${paidCount} parcela(s) paga(s) via PIX/Cartão (-R$ ${totalAmortized.toFixed(2)}). Restam ${remainingInstallments} parcelas de R$ 5.691,46.`
      : `Empréstimo de curto prazo: 50 parcelas de R$ 5.691,46 (Total R$ 284.573,00). Detecção automática de PIX de R$ 5.691,46 ativada para abatimento.`;

  if (existingItem) {
    await prisma.personalBalanceItem.update({
      where: { id: existingItem.id },
      data: {
        title,
        value: remainingDebt,
        subgroup: "CIRCULANTE",
        notes,
        institution: "PIX Cartão de Crédito / Banco",
      },
    });
  } else {
    // Procura se tem algum item genérico de empréstimos zerado para reaproveitar
    const genericItem = await prisma.personalBalanceItem.findFirst({
      where: {
        userId,
        type: "LIABILITY",
        category: LOAN_CONFIG.CATEGORY,
        value: 0,
      },
    });

    if (genericItem) {
      await prisma.personalBalanceItem.update({
        where: { id: genericItem.id },
        data: {
          title,
          value: remainingDebt,
          subgroup: "CIRCULANTE",
          notes,
          institution: "PIX Cartão de Crédito / Banco",
        },
      });
    } else {
      await prisma.personalBalanceItem.create({
        data: {
          userId,
          type: "LIABILITY",
          subgroup: "CIRCULANTE",
          category: LOAN_CONFIG.CATEGORY,
          title,
          institution: "PIX Cartão de Crédito / Banco",
          value: remainingDebt,
          notes,
          isAutoCalculated: true,
        },
      });
    }
  }

  return {
    baseInstallments: LOAN_CONFIG.BASE_INSTALLMENTS,
    paidCount,
    remainingInstallments,
    remainingDebt,
    totalAmortized,
    detectedTransactions: validPaymentTxs.map((t) => ({
      id: t.id,
      date: t.date,
      amount: Number(t.amount),
      description: t.description,
      sourceType: t.sourceType,
      competenceMonth: t.competenceMonth,
    })),
  };
}
