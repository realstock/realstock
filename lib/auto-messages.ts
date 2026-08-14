import { prisma } from "@/lib/prisma";

export const AUTO_MESSAGE_EVENTS: Record<string, { title: string; description: string; defaultText: string }> = {
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
  }
};

/**
 * Triggers an automatic message for a specific reservation event
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

    // Check host's AutoMessageSetting in DB
    const setting = await prisma.autoMessageSetting.findUnique({
      where: {
        userId_event: {
          userId: hostId,
          event: eventKey
        }
      }
    });

    const eventInfo = AUTO_MESSAGE_EVENTS[eventKey];
    if (!eventInfo) return;

    // If setting exists and is explicitly disabled, do not send
    if (setting && !setting.isEnabled) {
      return;
    }

    // Determine template text
    const templateText = setting?.messageText || eventInfo.defaultText;
    if (!templateText || !templateText.trim()) return;

    // Format address
    const fullAddress = [
      offer.property.street ? `${offer.property.street}, ${offer.property.addressNumber || "s/n"}` : null,
      offer.property.neighborhood,
      offer.property.city && offer.property.state ? `${offer.property.city} - ${offer.property.state}` : null,
      offer.property.zipCode ? `CEP: ${offer.property.zipCode}` : null,
    ].filter(Boolean).join(" • ") || offer.property.city;

    // Format values and placeholders
    const formattedDeposit = offer.depositAmount
      ? Number(offer.depositAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      : "0,00";

    const formattedStartDate = offer.startDate
      ? new Date(offer.startDate).toLocaleDateString("pt-BR")
      : "Data a definir";

    const formattedMessage = templateText
      .replaceAll("{hospede}", offer.buyer?.name || "Hóspede")
      .replaceAll("{imovel}", offer.property.title || "Imóvel")
      .replaceAll("{valor_sinal}", formattedDeposit)
      .replaceAll("{chave_pix}", offer.property.pixKey || "Consulte o anfitrião")
      .replaceAll("{data_checkin}", formattedStartDate)
      .replaceAll("{horario_checkin}", offer.property.checkInTime || "14:00")
      .replaceAll("{horario_checkout}", offer.property.checkOutTime || "12:00")
      .replaceAll("{endereco}", fullAddress)
      .replaceAll("{wifi_senha}", offer.property.checkInInstructions || "Chave e instruções na recepção.");

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
          lastMessage: formattedMessage,
        }
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: formattedMessage,
          updatedAt: new Date(),
        }
      });
    }

    // Insert ChatMessage from host
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: hostId,
        text: formattedMessage,
      }
    });

    console.log(`[AUTO-MESSAGE] Sent event ${eventKey} for offer #${offerId} in conv #${conversation.id}`);
  } catch (err) {
    console.error(`[AUTO-MESSAGE ERROR] Failed event ${eventKey} for offer #${offerId}:`, err);
  }
}
