import { NextResponse } from "next/server";
import { getSuccessionStatus } from "@/lib/succession";
import {
  sendMonthlyAccountingReport,
  sendSuccessionAlertEmail,
} from "@/lib/successionEmails";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/succession-check
 * Rota periódica acionada pelo Vercel Cron (ou agendador externo).
 * Executa:
 * 1) Envio mensal da contabilidade pessoal para isaacluzdefaria@gmail.com
 * 2) Verificação do Dead-Man's Switch (inatividade de 180 dias / 6 meses do Leo)
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isDev = process.env.NODE_ENV !== "production";
      if (!isDev) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const results: {
      monthlyAccounting: { checked: boolean; sent: boolean; reason?: string };
      deadMansSwitch: { checked: boolean; triggered: boolean; daysInactive: number; reason?: string };
    } = {
      monthlyAccounting: { checked: true, sent: false },
      deadMansSwitch: { checked: true, triggered: false, daysInactive: 0 },
    };

    const status = await getSuccessionStatus();
    results.deadMansSwitch.daysInactive = status.daysSinceLastActivity;

    // 1. CHECAGEM DO ENVIO MENSAL DA CONTABILIDADE PESSOAL
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    let shouldSendAccounting = false;
    if (!status.lastAccountingSentAt) {
      shouldSendAccounting = true;
    } else {
      const lastSent = new Date(status.lastAccountingSentAt);
      const lastSentMonth = lastSent.getMonth() + 1;
      const lastSentYear = lastSent.getFullYear();

      // Se ainda não enviou no mês corrente (ou virou o ano)
      if (lastSentYear < currentYear || (lastSentYear === currentYear && lastSentMonth < currentMonth)) {
        shouldSendAccounting = true;
      }
    }

    if (shouldSendAccounting) {
      // Envia os dados do mês anterior recém-fechado
      const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const accountingRes = await sendMonthlyAccountingReport({
        month: prevMonth,
        year: prevYear,
        recipient: status.accountingEmailRecipient,
      });

      results.monthlyAccounting.sent = accountingRes.success;
      if (!accountingRes.success) {
        results.monthlyAccounting.reason = accountingRes.error;
      }
    } else {
      results.monthlyAccounting.reason = "Relatório deste mês já foi enviado anteriormente.";
    }

    // 2. CHECAGEM DO DEAD-MAN'S SWITCH (6 MESES DE INATIVIDADE)
    if (status.isExpired && !status.successionEmailSent) {
      console.warn(`[DEAD-MAN'S SWITCH DISPARADO]: ${status.daysSinceLastActivity} dias sem login de Leo Batisti.`);
      
      const alertRes = await sendSuccessionAlertEmail(status.successorEmail);
      results.deadMansSwitch.triggered = alertRes.success;
      if (!alertRes.success) {
        results.deadMansSwitch.reason = alertRes.error;
      }
    } else if (status.successionEmailSent) {
      results.deadMansSwitch.reason = "Alerta de sucessão já foi disparado anteriormente.";
    } else {
      results.deadMansSwitch.reason = `Atividade recente detectada (${status.daysRemaining} dias restantes até o gatilho de 6 meses).`;
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("Cron succession check error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
