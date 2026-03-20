import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    if (user.password !== password) {
      return NextResponse.json(
        { success: false, error: "Senha inválida." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        cpfCnpj: user.cpfCnpj,
        phone: user.phone,
        instagram: user.instagram,
        country: user.country,
        state: user.state,
        city: user.city,
        paypalEmail: user.paypalEmail,
        role: user.role,
        verified: user.verified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("ERRO /api/login:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro interno ao fazer login.",
      },
      { status: 500 }
    );
  }
}