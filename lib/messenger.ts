import { sendEmail } from "./email";

interface MessagePayload {
  toEmail?: string;
  toPhone?: string;
  subject: string;
  text: string;
  html?: string;
  mediaUrl?: string;
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
      let cleanPhone = toPhone.replace(/\D/g, "");
      if (cleanPhone.length === 11) cleanPhone = "55" + cleanPhone;

      const endpoint = payload.mediaUrl ? whatsappUrl.replace("sendText", "sendMedia") : whatsappUrl;
      
      const body: any = {
        number: cleanPhone,
      };

      if (payload.mediaUrl) {
        body.media = payload.mediaUrl;
        body.caption = `*${subject}*\n\n${text}`;
        body.mediaType = "image";
      } else {
        body.text = `*${subject}*\n\n${text}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": whatsappToken || "",
        },
        body: JSON.stringify(body),
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
