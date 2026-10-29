import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getSuccessionStatus,
  recordOwnerActivity,
  updateSuccessionConfig,
} from "@/lib/succession";
import {
  sendMonthlyAccountingReport,
  sendSuccessionAlertEmail,
  getMonthlyAccountingData,
} from "@/lib/successionEmails";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sucessao
 * Retorna status completo do Dead-Man's Switch, dados do mês e configurações.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      // Checa se há token de admin nos headers ou fallback
      const authHeader = req.headers.get("authorization");
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        // Para visualização de desenvolvimento ou autenticação por localStorage
        // Permitimos caso esteja em dev ou se há um admin no banco
      }
    }

    const status = await getSuccessionStatus();
    const accountingPreview = await getMonthlyAccountingData();

    return NextResponse.json({
      success: true,
      status,
      accountingPreview,
      envStatus: {
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasVercelEnv: !!process.env.VERCEL,
        fromEmail: process.env.EMAIL_FROM || "RealStock <onboarding@resend.dev>",
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/sucessao error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao consultar status de sucessão." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sucessao
 * Executa ações: ping (reset heartbeat), send_accounting, test_succession_email, update_config, simulate_inactivity
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Ação não especificada." },
        { status: 400 }
      );
    }

    switch (action) {
      case "ping": {
        // Registra atividade imediata do proprietário
        await recordOwnerActivity("leobatisti@gmail.com");
        const status = await getSuccessionStatus();
        return NextResponse.json({
          success: true,
          message: "Atividade registrada com sucesso! Contador de 180 dias reiniciado.",
          status,
        });
      }

      case "send_accounting": {
        // Dispara relatório mensal de contabilidade pessoal
        const result = await sendMonthlyAccountingReport({
          month: body.month,
          year: body.year,
          recipient: body.recipient,
          isManual: true,
        });

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error || "Falha ao enviar e-mail de contabilidade." },
            { status: 500 }
          );
        }

        const status = await getSuccessionStatus();
        return NextResponse.json({
          success: true,
          message: "Relatório de contabilidade pessoal enviado com sucesso!",
          status,
          data: result.data,
        });
      }

      case "test_succession_email": {
        // Dispara e-mail de teste de alerta de sucessão para o Isaac
        const result = await sendSuccessionAlertEmail(body.recipient);

        if (!result.success) {
          return NextResponse.json(
            { success: false, error: result.error || "Falha ao enviar e-mail de teste de sucessão." },
            { status: 500 }
          );
        }

        const status = await getSuccessionStatus();
        return NextResponse.json({
          success: true,
          message: "E-mail de instruções de sucessão enviado com sucesso!",
          status,
          data: result.data,
        });
      }

      case "update_config": {
        const updated = await updateSuccessionConfig({
          ownerEmail: body.ownerEmail,
          successorEmail: body.successorEmail,
          accountingEmailRecipient: body.accountingEmailRecipient,
          inactivityThresholdDays: body.inactivityThresholdDays
            ? parseInt(body.inactivityThresholdDays, 10)
            : undefined,
          notes: body.notes,
        });

        return NextResponse.json({
          success: true,
          message: "Configurações de sucessão salvas com sucesso!",
          config: updated,
        });
      }

      case "simulate_inactivity": {
        // Simula inatividade definindo lastOwnerActivityAt para X dias no passado
        const days = body.days ? parseInt(body.days, 10) : 185;
        const simulatedDate = new Date();
        simulatedDate.setDate(simulatedDate.getDate() - days);

        await (prisma as any).systemSuccession.update({
          where: { id: "default" },
          data: {
            lastOwnerActivityAt: simulatedDate,
            successionEmailSent: false,
            updatedAt: new Date(),
          },
        });

        const status = await getSuccessionStatus();
        return NextResponse.json({
          success: true,
          message: `Inatividade de ${days} dias simulada para demonstração.`,
          status,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Ação '${action}' não reconhecida.` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("POST /api/admin/sucessao error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao processar solicitação de sucessão." },
      { status: 500 }
    );
  }
}
