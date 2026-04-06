import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email inválido." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "Se o email existir, enviaremos um link para redefinição de senha.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const resetUrl = `${siteUrl}/resetar-senha?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Redefinição de senha - RealStock",
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.6; color:#111827;">
          <h2>Redefinição de senha</h2>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:10px;">
              Redefinir senha
            </a>
          </p>
          <p>Esse link expira em 1 hora.</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message:
        "Se o email existir, enviaremos um link para redefinição de senha.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro ao processar solicitação.",
      },
      { status: 500 }
    );
  }
}