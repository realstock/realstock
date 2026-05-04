import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const adminEmail = session?.user?.email;

    if (!adminEmail) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (admin?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito" }, { status: 403 });
    }

    const { targetUserId, serviceType, amount } = await req.json();

    if (!targetUserId || !serviceType || !amount || Number(amount) < 1) {
      return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 });
    }

    if (serviceType === "VIRALIZAR") {
      await prisma.user.update({
        where: { id: Number(targetUserId) },
        data: { viralizarCredits: { increment: Number(amount) } }
      });
    } else if (serviceType === "TURBINAR") {
      await prisma.user.update({
        where: { id: Number(targetUserId) },
        data: { turbinarCredits: { increment: Number(amount) } }
      });
    } else {
      return NextResponse.json({ success: false, error: "Serviço inválido" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Adicionado ${amount} crédito(s) para o usuário` });
  } catch (error: any) {
    console.error("ADD CREDIT ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
