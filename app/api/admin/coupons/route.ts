import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito" }, { status: 403 });
    }

    const { code, serviceType, maxUses, value } = await req.json();
    
    if (!code || !serviceType || !maxUses) {
      return NextResponse.json({ success: false, error: "Dados incompletos" }, { status: 400 });
    }

    const exists = await prisma.coupon.findUnique({ where: { code: code.toUpperCase().trim() } });
    if (exists) {
      return NextResponse.json({ success: false, error: "Já existe um cupom com este código" }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        serviceType,
        value: serviceType === 'TURBINAR' ? Number(value) : 0,
        maxUses: Number(maxUses),
        isActive: true,
      }
    });

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    console.error("CREATE COUPON ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (user?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito" }, { status: 403 });
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
