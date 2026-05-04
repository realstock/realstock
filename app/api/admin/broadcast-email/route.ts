import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 403 });
    }

    const { subject, htmlContent } = await req.json();

    if (!subject || !htmlContent) {
      return NextResponse.json({ success: false, error: "Assunto e conteúdo são obrigatórios" }, { status: 400 });
    }

    // Buscar todos os usuários
    const users = await prisma.user.findMany({
      select: { email: true, name: true, referralCode: true, phone: true }
    });

    console.log(`Iniciando disparo para ${users.length} usuários via Engine de Mensageria.`);

    const { sendNotification } = require("@/lib/messenger");

    const results = await Promise.all(
      users.map(async (user) => {
        const personalText = htmlContent
          .replace(/<[^>]*>/g, '') // Stripping HTML for WhatsApp
          .replace(/\[NOME\]/g, user.name)
          .replace(/\[CODIGO\]/g, user.referralCode || "REALSTOCK-PRO")
          .replace(/\[REF_LINK\]/g, `https://realstock.com.br/cadastro?ref=${user.referralCode || ""}`);

        const personalHtml = htmlContent
          .replace(/\[NOME\]/g, user.name)
          .replace(/\[CODIGO\]/g, user.referralCode || "REALSTOCK-PRO")
          .replace(/\[REF_LINK\]/g, `https://realstock.com.br/cadastro?ref=${user.referralCode || ""}`);

        return sendNotification({
          toEmail: user.email,
          toPhone: user.phone,
          subject: subject,
          text: personalText,
          html: personalHtml,
        });
      })
    );

    return NextResponse.json({ 
      success: true, 
      message: `${users.length} notificações processadas com sucesso (E-mail + WhatsApp).`,
      results 
    });

  } catch (error: any) {
    console.error("BROADCAST EMAIL ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
