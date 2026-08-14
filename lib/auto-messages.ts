import { prisma } from "@/lib/prisma";

export const TRIGGER_MOMENT_OPTIONS = [
  { value: "ON_RESERVATION_REQUEST", label: "1. Na hora do pedido de reserva" },
  { value: "ON_HOST_ACCEPT", label: "2. Quando o anfitrião aceitar a reserva" },
  { value: "ON_DEPOSIT_PAID", label: "3. Após a confirmação do sinal" },
  { value: "ON_CHECKIN_RELEASED", label: "4. Ao liberar o check-in (Quitação total)" },
  { value: "ON_CHECKIN_DAY", label: "5. No dia do check-in" },
  { value: "ON_CHECKOUT_DAY", label: "6. No dia do check-out" },
  { value: "MANUAL_ONLY", label: "⚡ Apenas Resposta Rápida (Envio Manual no Chat)" },
];

export const AUTO_MESSAGE_EVENTS: Record<string, { title: string; description: string; defaultText: string; isCustom?: boolean }> = {
  ON_RESERVATION_REQUEST: {
    title: "1. Na Hora do Pedido da Reserva",
    description: "Enviado automaticamente assim que o hóspede enviar um pedido de reserva no site.",
    defaultText: "Olá {hospede}! Recebi seu pedido de reserva para o imóvel {imovel}. Em breve irei analisar o seu pedido. Qualquer dúvida, estou à disposição!"
  },
  ON_HOST_ACCEPT: {
    title: "2. Quando o Anfitrião Aceitar a Reserva",
    description: "Enviado no momento em que você aceitar a solicitação do hóspede.",
    defaultText: "Olá {hospede}! Aceitei seu pedido de reserva para o imóvel {imovel}. Por favor, efetue o pagamento do sinal de R$ {valor_sinal} para garantir as suas datas."
  },
  ON_DEPOSIT_PAID: {
    title: "3. Após a Confirmação do Sinal (Reserva Confirmada)",
    description: "Enviado quando o comprovante do sinal for verificado e a reserva for confirmada.",
    defaultText: "Olá {hospede}! O pagamento do sinal da reserva do imóvel {imovel} foi verificado e confirmado com sucesso! Suas datas estão garantidas."
  },
  ON_CHECKIN_RELEASED: {
    title: "4. Ao Liberar o Check-in (Quitação Total)",
    description: "Enviado quando o saldo total for quitado e o check-in for liberado.",
    defaultText: "Olá {hospede}! Seu check-in para o imóvel {imovel} foi LIBERADO com sucesso! 🎉 Endereço: {endereco}. Wi-Fi / Instruções: {wifi_senha}. Seja muito bem-vindo!"
  },
  ON_CHECKIN_DAY: {
    title: "5. No Dia do Check-in",
    description: "Lembrete de recepção no dia agendado para a entrada do hóspede.",
    defaultText: "Olá {hospede}! Hoje é o dia do seu check-in ({horario_checkin}) no imóvel {imovel}. Desejamos uma excelente viagem e uma ótima estadia!"
  },
  ON_CHECKOUT_DAY: {
    title: "6. No Dia do Check-out",
    description: "Lembrete de encerramento enviado no dia da saída do hóspede.",
    defaultText: "Olá {hospede}! Lembrando que hoje é o dia do seu check-out até às {horario_checkout} no imóvel {imovel}. Agradecemos imensamente a sua preferência!"
  },
  // 4 MENSAGENS PERSONALIZADAS EXTRAS DO ANFITRIÃO
  CUSTOM_1: {
    title: "7. Mensagem Adicional #1 (Personalizada)",
    description: "Mensagem extra customizável enviada no momento escolhido pelo anfitrião.",
    defaultText: "Olá {hospede}! Aqui estão informações adicionais sobre a sua estadia no imóvel {imovel}. Se precisar de algo, estou à disposição!",
    isCustom: true
  },
  CUSTOM_2: {
    title: "8. Mensagem Adicional #2 (Personalizada)",
    description: "Mensagem extra customizável enviada no momento escolhido pelo anfitrião.",
    defaultText: "Olá {hospede}! Lembre-se de conferir as regras da casa e dicas de restaurantes perto do imóvel {imovel}.",
    isCustom: true
  },
  CUSTOM_3: {
    title: "9. Mensagem Adicional #3 (Personalizada)",
    description: "Mensagem extra customizável enviada no momento escolhido pelo anfitrião.",
    defaultText: "Olá {hospede}! Seguem informações sobre estacionamento e acesso ao imóvel {imovel}.",
    isCustom: true
  },
  CUSTOM_4: {
    title: "10. Mensagem Adicional #4 (Personalizada)",
    description: "Mensagem extra customizável enviada no momento escolhido pelo anfitrião.",
    defaultText: "Olá {hospede}! Esperamos que esteja aproveitando sua estadia no imóvel {imovel}! Qualquer dúvida, pode nos mandar mensagem.",
    isCustom: true
  }
};

/**
 * Triggers automatic messages for a specific reservation event
 */
export async function triggerAutoMessage(eventKey: string, offerId: number) {
  try {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        buyer: true,
        property: {
          include: {
            owner: true
          }
        }
      }
    });

    if (!offer || !offer.property || !offer.property.ownerId) {
      return;
    }

    const hostId = offer.property.ownerId;

    // Fetch ALL host settings from DB
    const dbSettings = await prisma.autoMessageSetting.findMany({
      where: { userId: hostId }
    });

    const settingsMap = new Map(dbSettings.map(s => [s.event, s]));

    // Determine matching messages to send for this eventKey:
    // 1) Standard message matching eventKey directly
    // 2) Any custom message (CUSTOM_1..4) configured with targetEvent === eventKey
    const messagesToSend: Array<{ key: string; text: string }> = [];

    // Check standard setting
    const stdSetting = settingsMap.get(eventKey);
    const stdMeta = AUTO_MESSAGE_EVENTS[eventKey];

    if (stdMeta && (!stdSetting || stdSetting.isEnabled)) {
      const text = stdSetting?.messageText || stdMeta.defaultText;
      if (text && text.trim()) {
        messagesToSend.push({ key: eventKey, text });
      }
    }

    // Check custom settings
    ["CUSTOM_1", "CUSTOM_2", "CUSTOM_3", "CUSTOM_4"].forEach((customKey) => {
      const customSetting = settingsMap.get(customKey);
      const customMeta = AUTO_MESSAGE_EVENTS[customKey];
      if (customSetting && customSetting.isEnabled) {
        const activeTarget = customSetting.targetEvent || customKey;
        if (activeTarget === eventKey) {
          const text = customSetting.messageText || customMeta?.defaultText;
          if (text && text.trim()) {
            messagesToSend.push({ key: customKey, text });
          }
        }
      }
    });

    if (messagesToSend.length === 0) return;

    // Format common placeholders
    const fullAddress = [
      offer.property.street ? `${offer.property.street}, ${offer.property.addressNumber || "s/n"}` : null,
      offer.property.neighborhood,
      offer.property.city && offer.property.state ? `${offer.property.city} - ${offer.property.state}` : null,
      offer.property.zipCode ? `CEP: ${offer.property.zipCode}` : null,
    ].filter(Boolean).join(" • ") || offer.property.city;

    const formattedDeposit = offer.depositAmount
      ? Number(offer.depositAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : "0,00";

    const formattedStartDate = offer.startDate
      ? new Date(offer.startDate).toLocaleDateString("pt-BR")
      : "Data a definir";

    // Find or create Conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        propertyId_buyerId_sellerId: {
          propertyId: offer.propertyId,
          buyerId: offer.buyerId,
          sellerId: hostId,
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          propertyId: offer.propertyId,
          buyerId: offer.buyerId,
          sellerId: hostId,
          lastMessage: "",
        }
      });
    }

    let lastSentMessage = "";

    // Process each message
    for (const msgItem of messagesToSend) {
      const formattedMessage = msgItem.text
        .replaceAll("{hospede}", offer.buyer?.name || "Hóspede")
        .replaceAll("{imovel}", offer.property.title || "Imóvel")
        .replaceAll("{valor_sinal}", formattedDeposit)
        .replaceAll("{chave_pix}", offer.property.pixKey || "Consulte o anfitrião")
        .replaceAll("{data_checkin}", formattedStartDate)
        .replaceAll("{horario_checkin}", offer.property.checkInTime || "14:00")
        .replaceAll("{horario_checkout}", offer.property.checkOutTime || "12:00")
        .replaceAll("{endereco}", fullAddress)
        .replaceAll("{wifi_senha}", offer.property.checkInInstructions || "Chave e instruções na recepção.");

      await prisma.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: hostId,
          text: formattedMessage,
        }
      });

      lastSentMessage = formattedMessage;
      console.log(`[AUTO-MESSAGE] Sent ${msgItem.key} for offer #${offerId} in conv #${conversation.id}`);
    }

    if (lastSentMessage) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: lastSentMessage,
          updatedAt: new Date(),
        }
      });
    }

  } catch (err) {
    console.error(`[AUTO-MESSAGE ERROR] Failed event ${eventKey} for offer #${offerId}:`, err);
  }
}
