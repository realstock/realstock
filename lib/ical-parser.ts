export interface ICalEvent {
  start: Date;
  end: Date;
  summary: string;
}

export function parseICal(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = [];
  const lines = icalText.split(/\r?\n/);
  let currentEvent: any = null;

  for (const line of lines) {
    if (line.startsWith("BEGIN:VEVENT")) {
      currentEvent = {};
    } else if (line.startsWith("END:VEVENT")) {
      if (currentEvent && currentEvent.start && currentEvent.end) {
        events.push({
          start: currentEvent.start,
          end: currentEvent.end,
          summary: currentEvent.summary || "Período reservado",
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith("DTSTART")) {
        const parts = line.split(":");
        const val = parts[1];
        const date = parseICalDate(val);
        if (date) currentEvent.start = date;
      } else if (line.startsWith("DTEND")) {
        const parts = line.split(":");
        const val = parts[1];
        const date = parseICalDate(val);
        if (date) currentEvent.end = date;
      } else if (line.startsWith("SUMMARY")) {
        const parts = line.split(":");
        currentEvent.summary = parts.slice(1).join(":");
      }
    }
  }

  return events;
}

function parseICalDate(val: string): Date | null {
  if (!val) return null;
  
  // Format: YYYYMMDD or YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const year = parseInt(val.substring(0, 4));
  const month = parseInt(val.substring(4, 6)) - 1;
  const day = parseInt(val.substring(6, 8));

  if (val.includes("T")) {
    const hour = parseInt(val.substring(9, 11));
    const minute = parseInt(val.substring(11, 13));
    const second = parseInt(val.substring(13, 15));
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  // Se for apenas data (sem hora), definimos como meio-dia UTC para evitar problemas de fuso horário local
  return new Date(Date.UTC(year, month, day, 12, 0, 0));
}

export async function fetchICalEvents(url: string, platformName: string): Promise<ICalEvent[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[iCal Sync] Falha ao buscar calendário da plataforma ${platformName}: ${res.statusText}`);
      return [];
    }

    const text = await res.text();
    const events = parseICal(text);

    return events.map(evt => ({
      ...evt,
      summary: `Bloqueado via ${platformName} (${evt.summary})`,
    }));
  } catch (err) {
    console.error(`[iCal Sync] Erro ao sincronizar calendário da plataforma ${platformName}:`, err);
    return [];
  }
}
