import { Resend } from "resend";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurada. Email não enviado.");
    return { success: false, skipped: true };
  }

  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || "RealStock <onboarding@resend.dev>";

  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || "Erro ao enviar email com Resend.");
  }

  return { success: true, data };
}