import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getOrCreateSuccessionRecord } from "@/lib/succession";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatBRL(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface MonthlyAccountingSummary {
  month: number;
  year: number;
  monthName: string;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  savingsRate: number;
  transactionsCount: number;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  topExpenses: Array<{ description: string; amount: number; category: string; date: string }>;
  balanceSheet?: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  };
}

/**
 * Coleta os dados de contabilidade pessoal do proprietário para o mês/ano especificado.
 */
export async function getMonthlyAccountingData(
  targetMonth?: number,
  targetYear?: number
): Promise<MonthlyAccountingSummary> {
  const now = new Date();
  // Padrão: mês anterior se não especificado
  let m = targetMonth ?? (now.getMonth() === 0 ? 12 : now.getMonth());
  let y = targetYear ?? (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m, 1, 0, 0, 0));

  // Tenta encontrar o usuário pelo e-mail leobatisti@gmail.com ou role ADMIN
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: "leobatisti@gmail.com", mode: "insensitive" } },
        { role: "ADMIN" },
      ],
    },
  });

  const userId = user?.id;

  const whereClause: any = {
    OR: [
      { date: { gte: startDate, lt: endDate } },
      { competenceMonth: m, competenceYear: y },
    ],
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const transactions = await prisma.personalTransaction.findMany({
    where: whereClause,
    orderBy: { date: "desc" },
  });

  let totalIncome = 0;
  let totalCreditCardExpenses = 0;
  let totalBankExpenses = 0;
  let totalCardInvoicePayments = 0;
  const categoryMap: Record<string, number> = {};

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

      categoryMap[tx.category] = (categoryMap[tx.category] || 0) + amt;
    }
  });

  const hasCardExpenses = totalCreditCardExpenses > 0;
  const effectiveExpenses = hasCardExpenses
    ? Number((totalCreditCardExpenses + (totalBankExpenses - totalCardInvoicePayments)).toFixed(2))
    : Number((totalBankExpenses + totalCreditCardExpenses).toFixed(2));

  const netBalance = Number((totalIncome - effectiveExpenses).toFixed(2));
  const savingsRate = totalIncome > 0 ? Number(((netBalance / totalIncome) * 100).toFixed(1)) : 0;

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([cat, val]) => ({
      category: cat,
      amount: Number(val.toFixed(2)),
      percentage: effectiveExpenses > 0 ? Number(((val / effectiveExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topExpenses = transactions
    .filter((tx) => tx.type === "EXPENSE" && tx.category !== "Fatura de Cartão")
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((tx) => ({
      description: tx.description,
      amount: Number(tx.amount),
      category: tx.category,
      date: new Date(tx.date).toLocaleDateString("pt-BR"),
    }));

  // Busca itens de balanço patrimonial
  let balanceSheet: MonthlyAccountingSummary["balanceSheet"] = undefined;
  try {
    const balanceItems = await prisma.personalBalanceItem.findMany({
      where: userId ? { userId } : {},
    });

    if (balanceItems.length > 0) {
      let totalAssets = 0;
      let totalLiabilities = 0;
      balanceItems.forEach((item) => {
        const val = Number(item.value);
        if (item.type === "ASSET") totalAssets += val;
        else totalLiabilities += val;
      });
      balanceSheet = {
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
      };
    }
  } catch (err) {
    console.warn("Balanço patrimonial não disponível:", err);
  }

  return {
    month: m,
    year: y,
    monthName: MONTH_NAMES[m - 1],
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpenses: effectiveExpenses,
    netBalance,
    savingsRate,
    transactionsCount: transactions.length,
    categoryBreakdown,
    topExpenses,
    balanceSheet,
  };
}

/**
 * Envia o relatório mensal de contabilidade pessoal para Isaac Luz de Faria.
 */
export async function sendMonthlyAccountingReport(options?: {
  month?: number;
  year?: number;
  recipient?: string;
  isManual?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const config = await getOrCreateSuccessionRecord();
    const rawRecipient = options?.recipient || config.accountingEmailRecipient || "isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com";
    const recipientsList = rawRecipient.split(/[,;]+/).map((e: string) => e.trim()).filter(Boolean);

    const data = await getMonthlyAccountingData(options?.month, options?.year);

    const isPositive = data.netBalance >= 0;
    const netColor = isPositive ? "#10b981" : "#ef4444";

    const categoriesRows = data.categoryBreakdown.slice(0, 6).map((c) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 10px 12px; font-size: 14px; color: #cbd5e1;">${c.category}</td>
        <td style="padding: 10px 12px; font-size: 14px; color: #f8fafc; font-weight: 600; text-align: right;">${formatBRL(c.amount)}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #94a3b8; text-align: right;">${c.percentage}%</td>
      </tr>
    `).join("");

    const topExpensesRows = data.topExpenses.map((e) => `
      <tr style="border-bottom: 1px solid #1e293b;">
        <td style="padding: 8px 12px; font-size: 13px; color: #f1f5f9;">${e.description}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #94a3b8;">${e.category}</td>
        <td style="padding: 8px 12px; font-size: 13px; color: #f43f5e; font-weight: 600; text-align: right;">${formatBRL(e.amount)}</td>
      </tr>
    `).join("");

    const balanceHtml = data.balanceSheet ? `
      <div style="margin-top: 24px; padding: 18px; border-radius: 12px; background: #0f172a; border: 1px solid #334155;">
        <h4 style="margin: 0 0 12px; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Balanço Patrimonial Pessoal</h4>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #cbd5e1; font-size: 14px;">Total de Ativos (Bens e Investimentos):</span>
          <strong style="color: #10b981; font-size: 14px;">${formatBRL(data.balanceSheet.totalAssets)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #cbd5e1; font-size: 14px;">Total de Passivos (Dívidas e Cartões):</span>
          <strong style="color: #ef4444; font-size: 14px;">${formatBRL(data.balanceSheet.totalLiabilities)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #334155;">
          <strong style="color: #f8fafc; font-size: 15px;">Patrimônio Líquido:</strong>
          <strong style="color: #38bdf8; font-size: 16px;">${formatBRL(data.balanceSheet.netWorth)}</strong>
        </div>
      </div>
    ` : "";

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Contabilidade Pessoal - ${data.monthName}/${data.year}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px 16px;">
        <div style="max-width: 600px; margin: 0 auto; background: #0b1329; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Topo -->
          <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 24px; border-bottom: 1px solid #334155;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.1em;">RealStock Contabilidade</span>
              <span style="font-size: 12px; background: #312e81; color: #c7d2fe; padding: 4px 10px; border-radius: 20px;">${data.monthName} de ${data.year}</span>
            </div>
            <h1 style="margin: 16px 0 6px; font-size: 22px; color: #ffffff;">Relatório de Contabilidade Pessoal</h1>
            <p style="margin: 0; font-size: 14px; color: #94a3b8;">
              Enviado automaticamente para <strong>${recipientsList.join(", ")}</strong>.
            </p>
          </div>

          <!-- Cards Principais -->
          <div style="padding: 24px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div style="background: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 12px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Receitas Totais</div>
                <div style="font-size: 20px; font-weight: 700; color: #10b981;">${formatBRL(data.totalIncome)}</div>
              </div>
              <div style="background: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 12px;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">Despesas Efetivas</div>
                <div style="font-size: 20px; font-weight: 700; color: #f43f5e;">${formatBRL(data.totalExpenses)}</div>
              </div>
            </div>

            <!-- Saldo Líquido -->
            <div style="background: #0f172a; border: 1px solid #1e293b; padding: 18px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
              <div style="font-size: 13px; color: #94a3b8; margin-bottom: 4px;">Resultado Líquido do Mês</div>
              <div style="font-size: 26px; font-weight: 800; color: ${netColor};">${formatBRL(data.netBalance)}</div>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">
                Taxa de Economia: <strong style="color: #f8fafc;">${data.savingsRate}%</strong> (${data.transactionsCount} lançamentos)
              </div>
            </div>

            <!-- Maiores Categorias -->
            ${data.categoryBreakdown.length > 0 ? `
              <h3 style="margin: 20px 0 10px; font-size: 15px; color: #e2e8f0; font-weight: 600;">Principais Despesas por Categoria</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #0f172a; text-align: left;">
                    <th style="padding: 8px 12px; font-size: 12px; color: #94a3b8; font-weight: 600;">Categoria</th>
                    <th style="padding: 8px 12px; font-size: 12px; color: #94a3b8; font-weight: 600; text-align: right;">Valor</th>
                    <th style="padding: 8px 12px; font-size: 12px; color: #94a3b8; font-weight: 600; text-align: right;">%</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoriesRows}
                </tbody>
              </table>
            ` : ""}

            <!-- Top 5 Gastos -->
            ${data.topExpenses.length > 0 ? `
              <h3 style="margin: 20px 0 10px; font-size: 15px; color: #e2e8f0; font-weight: 600;">Top 5 Maiores Despesas</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #0f172a; text-align: left;">
                    <th style="padding: 8px 12px; font-size: 12px; color: #94a3b8; font-weight: 600;">Descrição</th>
                    <th style="padding: 8px 12px; font-size: 12px; color: #94a3b8; font-weight: 600;">Categoria</th>
                    <th style="padding: 8px 12px; font-size: 12px; color: #94a3b8; font-weight: 600; text-align: right;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${topExpensesRows}
                </tbody>
              </table>
            ` : ""}

            <!-- Balanço Patrimonial -->
            ${balanceHtml}

            <!-- Rodapé / Links -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center;">
              <a href="https://realstock.com.br/admin/contabilidade-pessoal" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;">
                Abrir Painel de Contabilidade
              </a>
              <p style="margin: 16px 0 0; font-size: 12px; color: #64748b;">
                RealStock Plataforma Imobiliária • Relatório Pessoal Confidencial
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
    `;

    const sendRes = await sendEmail({
      to: recipientsList,
      subject: `[RealStock] Relatório de Contabilidade Pessoal - ${data.monthName}/${data.year}`,
      html,
    });

    // Atualiza a data de último envio no banco
    await (prisma as any).systemSuccession.update({
      where: { id: "default" },
      data: {
        lastAccountingSentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true, data: sendRes };
  } catch (error: any) {
    console.error("Erro ao enviar relatório mensal de contabilidade:", error);
    return { success: false, error: error?.message || "Erro desconhecido" };
  }
}

/**
 * Envia o e-mail de emergência e instruções de sucessão para Isaac Luz de Faria
 * disparado quando mais de 180 dias de inatividade de Leo Batisti são identificados.
 */
export async function sendSuccessionAlertEmail(
  overrideRecipient?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const config = await getOrCreateSuccessionRecord();
    const rawRecipient = overrideRecipient || config.successorEmail || "isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com";
    const recipientsList = rawRecipient.split(/[,;]+/).map((e: string) => e.trim()).filter(Boolean);

    const lastActivityStr = new Date(config.lastOwnerActivityAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Instruções de Sucessão e Gestão do RealStock</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 24px 16px;">
        <div style="max-width: 650px; margin: 0 auto; background: #0b1329; border: 2px solid #ef4444; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(239, 68, 68, 0.2);">
          
          <!-- Topo de Alerta -->
          <div style="background: linear-gradient(135deg, #7f1d1d 0%, #1e1b4b 100%); padding: 28px; border-bottom: 1px solid #ef4444;">
            <span style="display: inline-block; background: #ef4444; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px;">
              Notificação de Sucessão Oficial
            </span>
            <h1 style="margin: 0 0 10px; font-size: 24px; color: #ffffff;">Instruções para Assumir o RealStock</h1>
            <p style="margin: 0; font-size: 15px; color: #fca5a5; line-height: 1.5;">
              Olá Isaac e Ravi, esta mensagem foi programada por <strong>Leo Batisti</strong> para ser entregue a vocês caso não houvesse nenhuma conexão por mais de 6 meses (último registro: ${lastActivityStr}).
            </p>
          </div>

          <!-- Corpo Principal -->
          <div style="padding: 28px; line-height: 1.6; font-size: 14px; color: #cbd5e1;">
            <p>
              Isaac e Ravi, não se preocupem: vocês não precisam ser programadores para tocar o site juntos. Toda a plataforma foi preparada para que vocês utilizem o <strong>Google Antigravity</strong> (o assistente de inteligência artificial de código) como o braço direito técnico de vocês.
            </p>

            <!-- Passo 1: Antigravity & Git -->
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px; font-size: 16px; color: #38bdf8;">1. Baixar o Antigravity e o Código do Site no Computador de Vocês</h3>
              <p style="margin: 0 0 12px; color: #cbd5e1; font-size: 13px;">
                Como vocês estão em computadores próprios, o processo para ter o site rodando leva apenas 2 minutos:
              </p>
              
              <div style="margin-bottom: 14px;">
                <a href="https://antigravity.google" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-size: 13px; font-weight: 700;">
                  📥 1. Baixar o Aplicativo Google Antigravity (Download Oficial)
                </a>
              </div>

              <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px;">
                2. No terminal do computador de vocês (ou Git Bash no Windows), colem este comando para baixar o projeto e conectar a IA:
              </p>
              <div style="background: #020617; border: 1px solid #1e293b; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #22c55e;">
                git clone https://github.com/realstock/realstock.git && cd realstock && ./setup-antigravity.sh
              </div>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                <em>(Ou baixem o arquivo ZIP diretamente em <a href="https://github.com/realstock/realstock" style="color: #38bdf8;">github.com/realstock/realstock</a> e abram a pasta no Antigravity IDE).</em>
              </p>
            </div>

            <!-- Passo 2: Conectar Vercel e Supabase -->
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px; font-size: 16px; color: #a855f7;">2. Como Conectar na Vercel e no Supabase (Sem Digitar Senhas)</h3>
              <p style="margin: 0 0 10px; color: #cbd5e1; font-size: 13px;">
                Todas as senhas e chaves do banco de dados <strong>Supabase</strong>, do <strong>PayPal</strong> e dos e-mails estão salvas na <strong>Vercel</strong>. Vocês não precisam digitar chaves secretas:
              </p>
              <div style="background: #020617; border: 1px solid #1e293b; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #f59e0b;">
                "Antigravity, conecte este computador à Vercel e ao Supabase do RealStock."
              </div>
              <p style="margin: 10px 0 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                O Antigravity executará <code>npx vercel env pull</code> e baixará todas as credenciais do banco Supabase automaticamente para a máquina de vocês!
              </p>
              <ul style="margin: 12px 0 0; padding-left: 18px; color: #cbd5e1; font-size: 13px;">
                <li style="margin-bottom: 6px;"><strong>GitHub (Código Fonte):</strong> <a href="https://github.com/realstock/realstock" style="color: #38bdf8;">github.com/realstock/realstock</a></li>
                <li style="margin-bottom: 6px;"><strong>Hospedagem na Nuvem:</strong> <a href="https://vercel.com" style="color: #38bdf8;">vercel.com</a> (onde o site roda online)</li>
                <li style="margin-bottom: 6px;"><strong>Banco de Dados:</strong> <a href="https://supabase.com" style="color: #38bdf8;">supabase.com</a> (todos os imóveis e usuários)</li>
                <li style="margin-bottom: 6px;"><strong>Pagamentos:</strong> <a href="https://paypal.com" style="color: #38bdf8;">paypal.com</a> (recebimento de taxas)</li>
              </ul>
            </div>

            <!-- Passo 3: Poderes de Owners Concedidos -->
            <div style="background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 8px; font-size: 16px; color: #10b981;">3. Poderes Totais de Owners Concedidos aos Dois</h3>
              <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 13px; line-height: 1.5;">
                ⚡ O Antigravity já está instruído a reconhecer <strong>Isaac Luz de Faria e Ravi Luz de Faria como os novos Proprietários Plenos (Owners)</strong> com autoridade irrestrita para tocar o site. Basta pedir frases em português simples:
              </p>
              <ul style="margin: 0; padding-left: 18px; color: #94a3b8; font-size: 13px;">
                <li><em>"Antigravity, verifique se o site está funcionando e se há erros no banco Supabase."</em></li>
                <li><em>"Antigravity, faça deploy das atualizações em produção na Vercel."</em></li>
                <li><em>"Antigravity, como podemos alterar uma taxa ou aprovar um anúncio?"</em></li>
                <li><em>"Antigravity, consulte os pagamentos recebidos no PayPal este mês."</em></li>
              </ul>
            </div>

            <!-- Botão Acessar Tutorial Completo -->
            <div style="text-align: center; margin: 32px 0 16px;">
              <a href="https://realstock.com.br/admin/sucessao" style="display: inline-block; background: #ef4444; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 700; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);">
                Acessar Tutorial Completo de Sucessão
              </a>
              <p style="margin: 12px 0 0; font-size: 12px; color: #64748b;">
                Acessem o painel do RealStock ou sigam o guia local no arquivo INSTRUCOES_ISAAC.md.
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
    `;

    const sendRes = await sendEmail({
      to: recipientsList,
      subject: `🚨 [IMPORTANTE] RealStock - Instruções para Tomar Conta da Plataforma (Plano de Sucessão)`,
      html,
    });

    // Registra que a sucessão foi disparada
    await (prisma as any).systemSuccession.update({
      where: { id: "default" },
      data: {
        successionEmailSent: true,
        successionTriggeredAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true, data: sendRes };
  } catch (error: any) {
    console.error("Erro ao enviar e-mail de alerta de sucessão:", error);
    return { success: false, error: error?.message || "Erro desconhecido" };
  }
}
