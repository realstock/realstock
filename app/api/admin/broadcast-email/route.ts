import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
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
      select: { email: true, name: true, referralCode: true }
    });

    console.log(`Iniciando disparo para ${users.length} usuários.`);

    // Enviar e-mails em lote (usando Resend ou similar)
    // Para cada usuário, precisamos injetar o código de indicação dele se houver tags de substituição
    const results = await Promise.all(
      users.map(async (user) => {
        // Substituir variáveis no template
        const personalHtml = htmlContent
          .replace(/\[NOME\]/g, user.name)
          .replace(/\[CODIGO\]/g, user.referralCode || "REALSTOCK-PRO")
          .replace(/\[REF_LINK\]/g, `https://realstock.com.br/cadastro?ref=${user.referralCode || ""}`);

        return resend.emails.send({
          from: "RealStock <contato@realstock.com.br>",
          to: user.email,
          subject: subject,
          html: personalHtml,
        });
      })
    );

    return NextResponse.json({ 
      success: true, 
      message: `${users.length} e-mails enviados com sucesso.`,
      results 
    });

  } catch (error: any) {
    console.error("BROADCAST EMAIL ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
