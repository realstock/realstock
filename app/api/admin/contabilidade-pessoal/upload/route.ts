import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseOfx } from "@/lib/personal-accounting/ofxParser";
import { parseCsv } from "@/lib/personal-accounting/csvParser";
import { parseTxt } from "@/lib/personal-accounting/txtParser";
import { parsePdfWithAI } from "@/lib/personal-accounting/pdfParser";
import { categorizeTransaction, batchCategorizeWithAI, PersonalCategory } from "@/lib/personal-accounting/categorizer";
import { detectCompetence, detectDocumentType } from "@/lib/personal-accounting/competenceDetector";
import { syncLoanAbatement } from "@/lib/personal-accounting/loanTracker";

function generateTxHash(userId: number, date: Date, amount: number, description: string): string {
  const dateKey = date.toISOString().slice(0, 10);
  const cleanDesc = description.trim().toLowerCase().replace(/\s+/g, " ");
  const raw = `${userId}_${dateKey}_${amount.toFixed(2)}_${cleanDesc}`;
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito para administradores." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const formData = await req.formData();

    const userAccountName = (formData.get("accountName") as string)?.trim() || "";
    const userSourceType = (formData.get("sourceType") as string)?.trim() || "AUTO";
    const userCompetenceMonth = formData.get("competenceMonth")
      ? parseInt(formData.get("competenceMonth") as string, 10)
      : null;
    const userCompetenceYear = formData.get("competenceYear")
      ? parseInt(formData.get("competenceYear") as string, 10)
      : null;

    // Pega todos os arquivos enviados
    const files = formData.getAll("file") as File[];
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const results = [];
    let totalImportedOverall = 0;
    let totalDuplicatesOverall = 0;

    for (const file of files) {
      const filename = file.name || "arquivo";
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const buffer = Buffer.from(await file.arrayBuffer());

      let parsedTxList: any[] = [];
      let detectedSourceType: "BANK_STATEMENT" | "CREDIT_CARD" = "BANK_STATEMENT";
      let finalAccountName = userAccountName;
      let filePeriodEnd: Date | undefined;
      let fileCompetenceMonth: number | undefined;
      let fileCompetenceYear: number | undefined;

      // Amostra de texto para identificação
      const contentPreview =
        ext === "pdf"
          ? ""
          : buffer.toString("utf-8", 0, Math.min(buffer.length, 12000));

      // 1. EXECUTA O PARSER CONFORME A EXTENSÃO DO ARQUIVO
      if (ext === "ofx") {
        const contentStr = buffer.toString("latin1"); // OFX frequentemente usa Latin1/Windows-1252
        const ofxRes = parseOfx(contentStr);
        parsedTxList = ofxRes.transactions;
        filePeriodEnd = ofxRes.periodEnd;
        detectedSourceType = ofxRes.sourceType;
        if (!finalAccountName) {
          finalAccountName = ofxRes.bankId
            ? `Banco (${ofxRes.bankId})`
            : detectedSourceType === "CREDIT_CARD"
            ? "Cartão de Crédito"
            : "Conta Bancária";
        }
      } else if (ext === "csv") {
        const contentStr = buffer.toString("utf-8");
        const csvRes = parseCsv(contentStr, filename);
        parsedTxList = csvRes.transactions;
        detectedSourceType = csvRes.sourceType;
        if (!finalAccountName) {
          finalAccountName = detectedSourceType === "CREDIT_CARD" ? "Cartão de Crédito" : "Conta Bancária";
        }
      } else if (ext === "txt") {
        const contentStr = buffer.toString("utf-8");
        const txtRes = await parseTxt(contentStr, filename);
        parsedTxList = txtRes.transactions;
        filePeriodEnd = txtRes.periodEnd;
        detectedSourceType = txtRes.sourceType;
        if (txtRes.competenceMonth) {
          fileCompetenceMonth = txtRes.competenceMonth;
          fileCompetenceYear = txtRes.competenceYear;
        }
        if (!finalAccountName) {
          finalAccountName =
            txtRes.accountName ||
            (detectedSourceType === "CREDIT_CARD" ? "Cartão de Crédito" : "Conta Bancária");
        }
      } else if (ext === "pdf") {
        const pdfRes = await parsePdfWithAI(buffer, filename);
        parsedTxList = pdfRes.transactions;
        filePeriodEnd = pdfRes.periodEnd;
        detectedSourceType = pdfRes.sourceType;
        if (pdfRes.competenceMonth) {
          fileCompetenceMonth = pdfRes.competenceMonth;
          fileCompetenceYear = pdfRes.competenceYear;
        }
        if (!finalAccountName) {
          finalAccountName =
            pdfRes.accountName ||
            (detectedSourceType === "CREDIT_CARD" ? "Cartão de Crédito" : "Conta Bancária");
        }
      } else {
        return NextResponse.json(
          { success: false, error: `Formato de arquivo não suportado: .${ext}. Use .OFX, .PDF, .CSV ou .TXT.` },
          { status: 400 }
        );
      }

      // Se for envio em lote (múltiplos arquivos), o tipo e a competência de cada arquivo
      // DEVEM ser detectados individualmente para não contaminar arquivos diferentes.
      const isMulti = files.length > 1;

      // Respeita seleção manual do usuário apenas se for arquivo único E não for OFX contraditório
      if (!isMulti) {
        if (userSourceType === "CREDIT_CARD" && detectedSourceType !== "BANK_STATEMENT") {
          detectedSourceType = "CREDIT_CARD";
        } else if (userSourceType === "BANK_STATEMENT" && detectedSourceType !== "CREDIT_CARD") {
          detectedSourceType = "BANK_STATEMENT";
        }
      }

      if (parsedTxList.length === 0) {
        results.push({
          filename,
          imported: 0,
          duplicates: 0,
          message: "Nenhuma transação encontrada no arquivo.",
        });
        continue;
      }

      // 2. DETECÇÃO DA COMPETÊNCIA (MÊS/ANO DA FATURA OU EXTRATO)
      // Se for múltiplos arquivos, não usa userCompetenceMonth genérico; deixa o detector extrair de cada arquivo
      const comp = detectCompetence(
        filename,
        isMulti ? fileCompetenceMonth : (userCompetenceMonth || fileCompetenceMonth),
        isMulti ? fileCompetenceYear : (userCompetenceYear || fileCompetenceYear),
        filePeriodEnd,
        contentPreview,
        parsedTxList
      );

      // 3. DEDUPLICAÇÃO INTELIGENTE & MAPEAMENTO DE DATAS
      // Para cartão de crédito: mapeia a data contábil para o mês de competência da fatura,
      // preservando a data original da compra (purchaseDate).
      const candidates = parsedTxList.map((tx) => {
        const origDate = new Date(tx.date);
        let effectiveDate = origDate;

        if (detectedSourceType === "CREDIT_CARD") {
          const purchaseDay = origDate.getUTCDate();
          const maxDays = new Date(Date.UTC(comp.year, comp.month, 0)).getUTCDate();
          const clampedDay = Math.min(Math.max(purchaseDay, 1), maxDays);
          effectiveDate = new Date(Date.UTC(comp.year, comp.month - 1, clampedDay, 12, 0, 0));
        }

        return {
          ...tx,
          purchaseDate: origDate,
          effectiveDate,
          competenceMonth: comp.month,
          competenceYear: comp.year,
          hash: generateTxHash(userId, origDate, tx.amount, tx.description),
          accountName:
            finalAccountName ||
            (detectedSourceType === "CREDIT_CARD" ? "Cartão de Crédito" : "Conta Bancária"),
        };
      });

      const hashes = candidates.map((c) => c.hash);
      const existingTxs = await prisma.personalTransaction.findMany({
        where: {
          userId,
          hash: { in: hashes },
        },
        select: { hash: true },
      });

      const existingHashSet = new Set(existingTxs.map((e) => e.hash));
      const newTransactions = candidates.filter((c) => !existingHashSet.has(c.hash));
      const duplicateCount = candidates.length - newTransactions.length;

      // 4. CATEGORIZAÇÃO
      const unknownItems: Array<{ id: string; description: string; amount: number }> = [];
      newTransactions.forEach((tx, idx) => {
        const cat = categorizeTransaction(tx.description, tx.type, detectedSourceType, tx.amount);
        tx.category = cat;
        if (cat === "Outros" && tx.type === "EXPENSE") {
          unknownItems.push({ id: String(idx), description: tx.description, amount: tx.amount });
        }
      });

      if (unknownItems.length > 0 && unknownItems.length <= 40) {
        try {
          const aiClassifications = await batchCategorizeWithAI(unknownItems);
          Object.entries(aiClassifications).forEach(([idxStr, cat]) => {
            const idx = parseInt(idxStr, 10);
            if (newTransactions[idx]) {
              newTransactions[idx].category = cat;
            }
          });
        } catch (aiErr) {
          console.error("AI batch categorization fallback skipped:", aiErr);
        }
      }

      // 5. CRIA O REGISTRO DO UPLOAD
      let totalIncome = 0;
      let totalExpense = 0;
      let minDate: Date | null = null;
      let maxDate: Date | null = null;

      candidates.forEach((c) => {
        if (c.type === "INCOME") totalIncome += c.amount;
        else totalExpense += c.amount;
        if (!minDate || c.purchaseDate < minDate) minDate = c.purchaseDate;
        if (!maxDate || c.purchaseDate > maxDate) maxDate = c.purchaseDate;
      });

      const uploadRecord = await prisma.personalUpload.create({
        data: {
          userId,
          filename,
          fileType: ext.toUpperCase(),
          sourceType: detectedSourceType,
          accountName: finalAccountName,
          competenceMonth: comp.month,
          competenceYear: comp.year,
          transactionsCount: newTransactions.length,
          totalIncome,
          totalExpense,
          periodStart: minDate,
          periodEnd: maxDate,
        },
      });

      // 6. INSERE TRANSAÇÕES EM LOTE NO BANCO DE DADOS
      if (newTransactions.length > 0) {
        await prisma.personalTransaction.createMany({
          data: newTransactions.map((tx) => ({
            userId,
            accountName: tx.accountName,
            sourceType: detectedSourceType,
            date: tx.effectiveDate,
            purchaseDate: tx.purchaseDate,
            competenceMonth: comp.month,
            competenceYear: comp.year,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            category: tx.category as string,
            rawText: tx.rawText || tx.description,
            hash: tx.hash,
            installment: tx.installment || null,
            uploadId: uploadRecord.id,
          })),
        });
      }

      totalImportedOverall += newTransactions.length;
      totalDuplicatesOverall += duplicateCount;

      results.push({
        filename,
        imported: newTransactions.length,
        duplicates: duplicateCount,
        sourceType: detectedSourceType,
        sourceTypeLabel: detectedSourceType === "CREDIT_CARD" ? "Fatura de Cartão de Crédito" : "Extrato Bancário",
        accountName: finalAccountName,
        competenceMonth: comp.month,
        competenceYear: comp.year,
        periodLabel: comp.periodLabel,
        detectedFrom: {
          sourceType: detectedSourceType,
          competence: comp.detectedFrom,
        },
        totalAmount: Number((totalIncome + totalExpense).toFixed(2)),
      });
    }

    // 7. SINCRONIZA ABATIMENTO DE EMPRÉSTIMOS CASO HAJA NOVAS TRANSAÇÕES
    try {
      await syncLoanAbatement(userId);
    } catch (syncErr) {
      console.error("Erro ao sincronizar abatimento de empréstimo após upload:", syncErr);
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalImported: totalImportedOverall,
        totalDuplicatesSkipped: totalDuplicatesOverall,
        filesProcessed: files.length,
      },
      results,
    });
  } catch (error: any) {
    console.error("Upload Contabilidade Pessoal Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao processar arquivo(s)." },
      { status: 500 }
    );
  }
}
