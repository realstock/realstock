/**
 * Detector de Mês e Ano de Competência para Faturas de Cartão e Extratos Bancários
 * Identifica automaticamente o período de referência (ex: Janeiro/2026) a partir de:
 * 1. Nome do arquivo (ex: ALTUS_LIV_VISA-Jan_26.ofx, fatura_fev_2026.pdf, 2026-01.csv)
 * 2. Seleção manual do usuário no formulário
 * 3. Data de fechamento da fatura (DTEND no OFX/PDF)
 */

const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 1,
  janeiro: 1,
  january: 1,
  fev: 2,
  fevereiro: 2,
  feb: 2,
  february: 2,
  mar: 3,
  marco: 3,
  março: 3,
  march: 3,
  abr: 4,
  abril: 4,
  apr: 4,
  april: 4,
  mai: 5,
  maio: 5,
  may: 5,
  jun: 6,
  junho: 6,
  june: 6,
  jul: 7,
  julho: 7,
  july: 7,
  ago: 8,
  agosto: 8,
  aug: 8,
  august: 8,
  set: 9,
  setembro: 9,
  sep: 9,
  september: 9,
  out: 10,
  outubro: 10,
  oct: 10,
  october: 10,
  nov: 11,
  novembro: 11,
  november: 11,
  dez: 12,
  dezembro: 12,
  dec: 12,
  december: 12,
};

export interface CompetenceResult {
  month: number; // 1 a 12
  year: number; // ex: 2026
  detectedFrom: "USER" | "FILENAME" | "CLOSING_DATE" | "FALLBACK";
}

export function detectCompetence(
  filename: string,
  userMonth?: number | null,
  userYear?: number | null,
  dtEnd?: Date | null
): CompetenceResult {
  // 1. Se o usuário selecionou explicitamente no formulário
  if (userMonth && userMonth >= 1 && userMonth <= 12 && userYear && userYear >= 2000) {
    return {
      month: userMonth,
      year: userYear,
      detectedFrom: "USER",
    };
  }

  const clean = (filename || "").toLowerCase();

  // 2. Procura mês por extenso ou abreviação + ano (ex: "Jan_26", "Jan-2026", "Janeiro_26", "Fev26")
  const textPattern =
    /(jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?|january|february|march|april|may|june|july|august|september|october|november|december)[_.s-]*(\d{2,4})/i;

  const textMatch = clean.match(textPattern);
  if (textMatch) {
    const mStr = textMatch[1].toLowerCase();
    const yStr = textMatch[2];
    const month = MONTH_NAMES_MAP[mStr];
    let year = parseInt(yStr, 10);
    if (year < 100) year += 2000;

    if (month && year >= 2000 && year <= 2100) {
      return {
        month,
        year,
        detectedFrom: "FILENAME",
      };
    }
  }

  // 3. Procura padrão numérico YYYY-MM ou MM-YYYY
  const numMatch = clean.match(/(\d{4})[_-](\d{1,2})/) || clean.match(/(\d{1,2})[_-](\d{4})/);
  if (numMatch) {
    let p1 = parseInt(numMatch[1], 10);
    let p2 = parseInt(numMatch[2], 10);
    if (p1 > 100) {
      if (p2 >= 1 && p2 <= 12) {
        return { month: p2, year: p1, detectedFrom: "FILENAME" };
      }
    } else {
      if (p1 >= 1 && p1 <= 12) {
        return { month: p1, year: p2, detectedFrom: "FILENAME" };
      }
    }
  }

  // 4. Se houver data de fechamento da fatura (dtEnd)
  if (dtEnd) {
    const endDay = dtEnd.getUTCDate();
    const endMonth = dtEnd.getUTCMonth() + 1;
    const endYear = dtEnd.getUTCFullYear();

    if (endDay >= 15) {
      const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
      const nextYear = endMonth === 12 ? endYear + 1 : endYear;
      return {
        month: nextMonth,
        year: nextYear,
        detectedFrom: "CLOSING_DATE",
      };
    } else {
      return {
        month: endMonth,
        year: endYear,
        detectedFrom: "CLOSING_DATE",
      };
    }
  }

  // 5. Fallback para data atual
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    detectedFrom: "FALLBACK",
  };
}
