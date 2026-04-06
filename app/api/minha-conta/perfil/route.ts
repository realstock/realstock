import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpfCnpj: true,
        phone: true,
        instagram: true,
        bio: true,
        paypalEmail: true,
        country: true,
        state: true,
        city: true,
        avatar: true,
        role: true,
        verified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao carregar perfil.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const userId = Number((session.user as any).id);
    const body = await req.json();

    const name = String(body.name || "").trim();
    const cpfCnpj = body.cpfCnpj ? String(body.cpfCnpj).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const instagram = body.instagram ? String(body.instagram).trim() : null;
    const bio = body.bio ? String(body.bio).trim() : null;
    const paypalEmail = body.paypalEmail
      ? String(body.paypalEmail).trim().toLowerCase()
      : null;
    const country = body.country ? String(body.country).trim() : null;
    const state = body.state ? String(body.state).trim() : null;
    const city = body.city ? String(body.city).trim() : null;
    const avatar = body.avatar ? String(body.avatar).trim() : null;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Nome é obrigatório." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        cpfCnpj,
        phone,
        instagram,
        bio,
        paypalEmail,
        country,
        state,
        city,
        avatar,
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpfCnpj: true,
        phone: true,
        instagram: true,
        bio: true,
        paypalEmail: true,
        country: true,
        state: true,
        city: true,
        avatar: true,
        role: true,
        verified: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao atualizar perfil.",
      },
      { status: 500 }
    );
  }
}