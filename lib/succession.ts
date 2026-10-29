import { prisma } from "@/lib/prisma";

export interface SuccessionRecord {
  id: string;
  ownerEmail: string;
  successorEmail: string;
  lastOwnerActivityAt: Date;
  inactivityThresholdDays: number;
  accountingEmailRecipient: string;
  lastAccountingSentAt: Date | null;
  successionTriggeredAt: Date | null;
  successionEmailSent: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SuccessionStatusResponse extends SuccessionRecord {
  daysSinceLastActivity: number;
  daysRemaining: number;
  isExpired: boolean;
  status: "ACTIVE" | "WARNING" | "TRIGGERED";
}

let tableEnsured = false;

/**
 * Garante que a tabela system_succession exista no banco de dados
 * auto-curando o schema caso migrations manuais ainda não tenham rodado.
 */
export async function ensureSuccessionTable(): Promise<void> {
  if (tableEnsured) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "system_succession" (
        "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
        "owner_email" TEXT NOT NULL DEFAULT 'leobatisti@gmail.com',
        "successor_email" TEXT NOT NULL DEFAULT 'isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com',
        "last_owner_activity_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "inactivity_threshold_days" INTEGER NOT NULL DEFAULT 180,
        "accounting_email_recipient" TEXT NOT NULL DEFAULT 'isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com',
        "last_accounting_sent_at" TIMESTAMP,
        "succession_triggered_at" TIMESTAMP,
        "succession_email_sent" BOOLEAN NOT NULL DEFAULT FALSE,
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    tableEnsured = true;
  } catch (error) {
    console.error("Falha ao garantir tabela system_succession:", error);
  }
}

/**
 * Obtém ou cria o registro padrão de sucessão.
 */
export async function getOrCreateSuccessionRecord(): Promise<SuccessionRecord> {
  await ensureSuccessionTable();

  const defaultSuccessors = "isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com";

  try {
    let record = await (prisma as any).systemSuccession.findUnique({
      where: { id: "default" },
    });

    if (!record) {
      record = await (prisma as any).systemSuccession.create({
        data: {
          id: "default",
          ownerEmail: "leobatisti@gmail.com",
          successorEmail: defaultSuccessors,
          lastOwnerActivityAt: new Date(),
          inactivityThresholdDays: 180,
          accountingEmailRecipient: defaultSuccessors,
          successionEmailSent: false,
        },
      });
    } else {
      // Se Ravi ainda não estiver nos destinatários, adiciona automaticamente
      let needsUpdate = false;
      let newSuccessorEmail = record.successorEmail;
      let newAccountingEmail = record.accountingEmailRecipient;

      if (!newSuccessorEmail.includes("raviluzdefaria@gmail.com")) {
        newSuccessorEmail = `${newSuccessorEmail}, raviluzdefaria@gmail.com`;
        needsUpdate = true;
      }
      if (!newAccountingEmail.includes("raviluzdefaria@gmail.com")) {
        newAccountingEmail = `${newAccountingEmail}, raviluzdefaria@gmail.com`;
        needsUpdate = true;
      }

      if (needsUpdate) {
        record = await (prisma as any).systemSuccession.update({
          where: { id: "default" },
          data: {
            successorEmail: newSuccessorEmail,
            accountingEmailRecipient: newAccountingEmail,
            updatedAt: new Date(),
          },
        });
      }
    }

    return record as SuccessionRecord;
  } catch (err) {
    console.warn("Usando fallback de dados padrão de sucessão:", err);
    return {
      id: "default",
      ownerEmail: "leobatisti@gmail.com",
      successorEmail: defaultSuccessors,
      lastOwnerActivityAt: new Date(),
      inactivityThresholdDays: 180,
      accountingEmailRecipient: defaultSuccessors,
      lastAccountingSentAt: null,
      successionTriggeredAt: null,
      successionEmailSent: false,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Retorna o status consolidado do Dead-Man's Switch com métricas e contadores.
 */
export async function getSuccessionStatus(): Promise<SuccessionStatusResponse> {
  const record = await getOrCreateSuccessionRecord();

  const now = new Date();
  const lastActivity = new Date(record.lastOwnerActivityAt);
  const diffMs = now.getTime() - lastActivity.getTime();
  const daysSinceLastActivity = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, record.inactivityThresholdDays - daysSinceLastActivity);
  const isExpired = daysSinceLastActivity >= record.inactivityThresholdDays;

  let status: "ACTIVE" | "WARNING" | "TRIGGERED" = "ACTIVE";
  if (record.successionEmailSent || isExpired) {
    status = "TRIGGERED";
  } else if (daysSinceLastActivity >= record.inactivityThresholdDays - 30) {
    status = "WARNING"; // Menos de 30 dias para o gatilho
  }

  return {
    ...record,
    daysSinceLastActivity,
    daysRemaining,
    isExpired,
    status,
  };
}

/**
 * Registra atividade do proprietário (leobatisti@gmail.com),
 * resetando o contador do Dead-Man's Switch de 180 dias.
 */
export async function recordOwnerActivity(email?: string): Promise<boolean> {
  try {
    const record = await getOrCreateSuccessionRecord();

    const normalizedEmail = (email || "").trim().toLowerCase();
    const targetEmail = record.ownerEmail.toLowerCase();

    // Se um e-mail foi passado, só atualiza se for o e-mail do Leo
    if (normalizedEmail && normalizedEmail !== targetEmail) {
      return false;
    }

    await (prisma as any).systemSuccession.update({
      where: { id: "default" },
      data: {
        lastOwnerActivityAt: new Date(),
        successionEmailSent: false,
        updatedAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    console.error("Erro ao registrar atividade do proprietário:", error);
    return false;
  }
}

/**
 * Atualiza configurações de sucessão (e-mails, limites de dias, etc.).
 */
export async function updateSuccessionConfig(data: {
  ownerEmail?: string;
  successorEmail?: string;
  accountingEmailRecipient?: string;
  inactivityThresholdDays?: number;
  notes?: string;
}): Promise<SuccessionRecord> {
  await getOrCreateSuccessionRecord();

  const updated = await (prisma as any).systemSuccession.update({
    where: { id: "default" },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  return updated;
}
