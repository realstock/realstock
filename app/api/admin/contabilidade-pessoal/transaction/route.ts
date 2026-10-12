import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Não autorizado." }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await req.json();

    const { description, amount, type, category, accountName, date } = body;

    if (!description || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ success: false, error: "Dados inválidos para o lançamento." }, { status: 400 });
    }

    const txDate = date ? new Date(date) : new Date();
    const cleanAmount = Number(parseFloat(amount).toFixed(2));
    const txType = type === "INCOME" ? "INCOME" : "EXPENSE";
    const txCategory = category || (txType === "INCOME" ? "Renda / Salário" : "Outros");
    const accName = accountName || "Carteira / Manual";

    const hash = crypto
      .createHash("sha256")
      .update(`${userId}_${txDate.toISOString().slice(0, 10)}_${cleanAmount}_${description.toLowerCase()}_manual_${Date.now()}`)
      .digest("hex");

    const created = await prisma.personalTransaction.create({
      data: {
        userId,
        description: String(description).trim(),
        amount: cleanAmount,
        type: txType,
        category: txCategory,
        accountName: accName,
        sourceType: "MANUAL",
        date: txDate,
        hash,
        rawText: `Manual: ${description}`,
      },
    });

    return NextResponse.json({ success: true, transaction: created });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao criar lançamento manual." },
      { status: 500 }
    );
  }
}
