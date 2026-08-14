import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AUTO_MESSAGE_EVENTS } from "@/lib/auto-messages";

// GET: Fetch host's automatic message settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);

    // Fetch existing settings from DB
    const dbSettings = await prisma.autoMessageSetting.findMany({
      where: { userId }
    });

    const settingsMap = new Map(dbSettings.map(s => [s.event, s]));

    // Build complete list of all events
    const result = Object.entries(AUTO_MESSAGE_EVENTS).map(([key, meta]) => {
      const existing = settingsMap.get(key);
      return {
        event: key,
        title: meta.title,
        description: meta.description,
        defaultText: meta.defaultText,
        isEnabled: existing ? existing.isEnabled : true,
        messageText: existing ? existing.messageText : meta.defaultText,
      };
    });

    return NextResponse.json({ success: true, settings: result });
  } catch (error: any) {
    console.error("GET /api/chat/auto-messages error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Erro interno" }, { status: 500 });
  }
}

// POST: Save or update host's automatic message settings
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const body = await req.json();

    // Can receive single setting { event, isEnabled, messageText } or array { settings: [...] }
    const settingsToSave: { event: string; isEnabled: boolean; messageText: string }[] = 
      Array.isArray(body.settings) ? body.settings : body.event ? [body] : [];

    if (settingsToSave.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum dado enviado" }, { status: 400 });
    }

    // Upsert each setting
    for (const item of settingsToSave) {
      if (!AUTO_MESSAGE_EVENTS[item.event]) continue;

      await prisma.autoMessageSetting.upsert({
        where: {
          userId_event: {
            userId,
            event: item.event
          }
        },
        create: {
          userId,
          event: item.event,
          isEnabled: item.isEnabled !== false,
          messageText: item.messageText || AUTO_MESSAGE_EVENTS[item.event].defaultText
        },
        update: {
          isEnabled: item.isEnabled !== false,
          messageText: item.messageText || AUTO_MESSAGE_EVENTS[item.event].defaultText
        }
      });
    }

    return NextResponse.json({ success: true, message: "Configurações de mensagens automáticas salvas com sucesso!" });
  } catch (error: any) {
    console.error("POST /api/chat/auto-messages error:", error);
    return NextResponse.json({ success: false, error: error?.message || "Erro interno" }, { status: 500 });
  }
}
