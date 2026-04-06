import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "").trim();

    const cpfCnpj = body.cpfCnpj ? String(body.cpfCnpj).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const instagram = body.instagram ? String(body.instagram).trim() : null;
    const bio = body.bio ? String(body.bio).trim() : null;
    const paypalEmail = body.paypalEmail
      ? String(body.paypalEmail).trim().toLowerCase()
      : null;
    const country = body.country ? String(body.country).trim() : "Brasil";
    const state = body.state ? String(body.state).trim() : null;
    const city = body.city ? String(body.city).trim() : null;
    const avatar = body.avatar ? String(body.avatar).trim() : null;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Nome, email e senha são obrigatórios.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "A senha deve ter pelo menos 6 caracteres.",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Já existe um usuário com esse email.",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        cpfCnpj,
        phone,
        instagram,
        bio,
        paypalEmail,
        country,
        state,
        city,
        avatar,
        role: "USER",
        verified: false,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        cpfCnpj: user.cpfCnpj,
        phone: user.phone,
        instagram: user.instagram,
        bio: user.bio,
        paypalEmail: user.paypalEmail,
        country: user.country,
        state: user.state,
        city: user.city,
        avatar: user.avatar,
        role: user.role,
        verified: user.verified,
      },
    });
  } catch (error: any) {
    console.error("CADASTRO ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao cadastrar usuário.",
      },
      { status: 500 }
    );
  }
}