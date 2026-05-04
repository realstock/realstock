import { sendEmail } from "./email";

interface MessagePayload {
  toEmail?: string;
  toPhone?: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Engine de Mensageria RealStock
 * Centraliza o envio de notificações via E-mail e WhatsApp
 */
export async function sendNotification(payload: MessagePayload) {
  const { toEmail, toPhone, subject, text, html } = payload;
  const results: any = { email: null, whatsapp: null };

  // 1. Tentar enviar E-mail
  if (toEmail) {
    try {
      results.email = await sendEmail({
        to: toEmail,
        subject,
        html: html || text,
      });
    } catch (e) {
      console.error("MESSENGER: Erro ao enviar e-mail", e);
    }
  }

  // 2. Tentar enviar WhatsApp
  const whatsappUrl = process.env.WHATSAPP_API_URL;
  const whatsappToken = process.env.WHATSAPP_TOKEN;

  if (toPhone && whatsappUrl) {
    try {
      // Limpar o número (manter apenas dígitos)
      let cleanPhone = toPhone.replace(/\D/g, "");
      
      // Garantir que tenha o código do país (Brasil 55) se tiver 11 dígitos
      if (cleanPhone.length === 11) cleanPhone = "55" + cleanPhone;

      // Implementação específica para Evolution API v1/v2
      const response = await fetch(whatsappUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": whatsappToken || "",
        },
        body: JSON.stringify({
          number: cleanPhone,
          options: {
            delay: 1200,
            presence: "composing",
            linkPreview: false
          },
          textMessage: {
            text: `*${subject}*\n\n${text}`
          }
        }),
      });

      const data = await response.json();
      results.whatsapp = data;
      console.log(`MESSENGER: WhatsApp enviado para ${cleanPhone}`);
    } catch (e) {
      console.error("MESSENGER: Erro ao enviar WhatsApp", e);
    }
  }

  return results;
}
