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

    const { subject, htmlContent, channel = "both", userIds = [], mediaUrl = null } = await req.json();

    if (!subject || !htmlContent) {
      return NextResponse.json({ success: false, error: "Assunto e conteúdo são obrigatórios" }, { status: 400 });
    }

    // Buscar usuários (todos ou apenas os selecionados)
    const users = await prisma.user.findMany({
      where: userIds && userIds.length > 0 ? { id: { in: userIds } } : {},
      select: { email: true, name: true, referralCode: true, phone: true }
    });

    console.log(`Iniciando disparo para ${users.length} usuários via Engine de Mensageria.`);

    const { sendNotification } = require("@/lib/messenger");

    const results = await Promise.all(
      users.map(async (user) => {
        const siteUrl = "https://www.realstock.com.br";

        const personalText = htmlContent
          .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)") // Converte <a> para "Texto (URL)"
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<\/div>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .replace(/\n\s*\n/g, "\n\n")
          .trim()
          .replace(/\[NOME\]/g, user.name)
          .replace(/\[CODIGO\]/g, user.referralCode || "REALSTOCK-PRO")
          .replace(/\[REF_LINK\]/g, `${siteUrl}/cadastro?ref=${user.referralCode || ""}`)
          .replace(/\[DASHBOARD_LINK\]/g, `${siteUrl}/minha-conta`)
          .replace(/\[ANUNCIOS_LINK\]/g, `${siteUrl}/minha-conta/anuncios`);

        const personalHtml = htmlContent
          .replace(/\[NOME\]/g, user.name)
          .replace(/\[CODIGO\]/g, user.referralCode || "REALSTOCK-PRO")
          .replace(/\[REF_LINK\]/g, `${siteUrl}/cadastro?ref=${user.referralCode || ""}`)
          .replace(/\[DASHBOARD_LINK\]/g, `${siteUrl}/minha-conta`)
          .replace(/\[ANUNCIOS_LINK\]/g, `${siteUrl}/minha-conta/anuncios`);

        return sendNotification({
          toEmail: (channel === "email" || channel === "both") ? user.email : undefined,
          toPhone: (channel === "whatsapp" || channel === "both") ? user.phone : undefined,
          subject: subject,
          text: personalText,
          html: personalHtml,
          mediaUrl: (channel === "whatsapp" || channel === "both") ? mediaUrl : undefined,
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
