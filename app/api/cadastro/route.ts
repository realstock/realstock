import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("BODY RECEBIDO /api/cadastro:", body);

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    const avatar = String(body.avatar || "").trim();
    const bio = String(body.bio || "").trim();
    const cpfCnpj = String(body.cpf_cnpj || "").trim();
    const phone = String(body.phone || "").trim();
    const instagram = String(body.instagram || "").trim();

    const country = String(body.country || "").trim();
    const stateName = String(body.state || "").trim();
    const city = String(body.city || "").trim();

    const paypalEmail = String(body.paypal_email || "").trim().toLowerCase();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Nome, email e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Já existe um usuário com este email." },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,

        avatar: avatar || null,
        bio: bio || null,
        cpfCnpj: cpfCnpj || null,
        phone: phone || null,
        instagram: instagram || null,

        country: country || null,
        state: stateName || null,
        city: city || null,

        paypalEmail: paypalEmail || null,
      },
    });

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
    console.error("ERRO /api/cadastro:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro interno ao cadastrar usuário.",
      },
      { status: 500 }
    );
  }
}