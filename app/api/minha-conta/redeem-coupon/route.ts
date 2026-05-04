import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { code, serviceType } = await req.json();

    if (!code || !serviceType) {
      return NextResponse.json({ success: false, error: "Código ou tipo de serviço ausente." }, { status: 400 });
    }

    // Buscar cupom
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ success: false, error: "Cupom inválido ou inativo." }, { status: 400 });
    }

    if (coupon.serviceType !== serviceType) {
      return NextResponse.json({ success: false, error: `Este cupom é válido apenas para o serviço ${coupon.serviceType}.` }, { status: 400 });
    }

    if (coupon.currentUses >= coupon.maxUses) {
      return NextResponse.json({ success: false, error: "O limite de usos deste cupom já foi atingido." }, { status: 400 });
    }

    // Iniciar transação para consumir o cupom e adicionar o crédito
    await prisma.$transaction(async (tx) => {
      // 1. Atualizar Cupom
      const updatedCoupon = await tx.coupon.update({
        where: { id: coupon.id },
        data: { currentUses: { increment: 1 } }
      });

      // Se atingiu o limite, inativar
      if (updatedCoupon.currentUses >= updatedCoupon.maxUses) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { isActive: false }
        });
      }

      // 2. Adicionar o crédito ao usuário
      if (serviceType === "VIRALIZAR") {
        await tx.user.update({
          where: { email: session.user.email! },
          data: { viralizarCredits: { increment: 1 } }
        });
      } else if (serviceType === "TURBINAR") {
        await tx.user.update({
          where: { email: session.user.email! },
          data: { turbinarCredits: { increment: 1 } }
        });
      }
    });

    return NextResponse.json({ success: true, message: "Cupom aplicado com sucesso! Crédito adicionado à sua conta." });
  } catch (error: any) {
    console.error("REDEEM COUPON ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
