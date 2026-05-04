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
      const cleanPhone = toPhone.replace(/\D/g, "");
      
      // Implementação genérica compatível com Evolution API, Z-API, etc.
      const response = await fetch(whatsappUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": whatsappToken || "", // Padrão Evolution API
          "Authorization": `Bearer ${whatsappToken}`, // Padrão genérico
        },
        body: JSON.stringify({
          number: cleanPhone,
          message: `*${subject}*\n\n${text}`,
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
