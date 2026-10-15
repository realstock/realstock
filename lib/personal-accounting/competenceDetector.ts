/**
 * Detector de Mês, Ano de Competência e Tipo de Documento para Faturas e Extratos
 * Identifica com precisão:
 * 1. Tipo do Documento: "CREDIT_CARD" (Fatura de Cartão) vs "BANK_STATEMENT" (Extrato Bancário)
 * 2. Mês e Ano de Competência (1 a 12, YYYY)
 * Suporta formatos: .OFX, .CSV, .TXT, .PDF
 */

export const MONTH_NAMES_PT: Record<number, string> = {
  1: "Janeiro",
  2: "Fevereiro",
  3: "Março",
  4: "Abril",
  5: "Maio",
  6: "Junho",
  7: "Julho",
  8: "Agosto",
  9: "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

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

export interface DocumentTypeResult {
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
  label: "Fatura de Cartão de Crédito" | "Extrato Bancário";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  detectedFrom: "USER" | "OFX_TAGS" | "CONTENT_KEYWORDS" | "FILENAME" | "FALLBACK";
}

export interface CompetenceResult {
  month: number; // 1 a 12
  year: number; // ex: 2026
  monthLabel: string; // "Janeiro"
  periodLabel: string; // "Janeiro/2026"
  detectedFrom: "USER" | "CONTENT_HEADER" | "FILENAME" | "TRANSACTIONS_DOMINANT" | "CLOSING_DATE" | "FALLBACK";
}

export interface FileMetadataResult {
  filename: string;
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD";
  sourceTypeLabel: "Fatura de Cartão de Crédito" | "Extrato Bancário";
  month: number;
  year: number;
  monthLabel: string;
  periodLabel: string;
  detectedFrom: {
    sourceType: string;
    competence: string;
  };
}

/**
 * Identifica se o documento é uma Fatura de Cartão de Crédito ou Extrato Bancário.
 */
export function detectDocumentType(
  filename: string,
  contentPreview?: string,
  userOverride?: string
): DocumentTypeResult {
  if (userOverride === "CREDIT_CARD") {
    return {
      sourceType: "CREDIT_CARD",
      label: "Fatura de Cartão de Crédito",
      confidence: "HIGH",
      detectedFrom: "USER",
    };
  }
  if (userOverride === "BANK_STATEMENT") {
    return {
      sourceType: "BANK_STATEMENT",
      label: "Extrato Bancário",
      confidence: "HIGH",
      detectedFrom: "USER",
    };
  }

  const cleanFilename = (filename || "").toLowerCase();
  const cleanContent = (contentPreview || "").toLowerCase();

  // 1. Tags OFX específicas (precisão máxima)
  if (
    cleanContent.includes("<creditcardmsgsrsv1>") ||
    cleanContent.includes("<ccstmttrnrs>") ||
    cleanContent.includes("<ccstmtrs>")
  ) {
    return {
      sourceType: "CREDIT_CARD",
      label: "Fatura de Cartão de Crédito",
      confidence: "HIGH",
      detectedFrom: "OFX_TAGS",
    };
  }
  if (
    cleanContent.includes("<bankmsgsrsv1>") ||
    cleanContent.includes("<banktranlist>") ||
    cleanContent.includes("<stmttrn>")
  ) {
    return {
      sourceType: "BANK_STATEMENT",
      label: "Extrato Bancário",
      confidence: "HIGH",
      detectedFrom: "OFX_TAGS",
    };
  }

  // 2. Pontuação por palavras-chave no conteúdo
  let cardScore = 0;
  let bankScore = 0;

  const cardContentPatterns = [
    /fatura\s*(?:do)?\s*cart[aã]o/i,
    /cart[aã]o\s*de\s*cr[ée]dito/i,
    /limite\s*(?:total|dispon[íi]vel|de\s*cr[ée]dito|do\s*cart[aã]o)?/i,
    /melhor\s*dia\s*(?:de\s*compra)?/i,
    /vencimento\s*(?:da\s*fatura)?/i,
    /compras\s*no\s*cart[aã]o/i,
    /data\s*da\s*compra/i,
    /pagamento\s*m[íi]nimo/i,
    /cr[ée]dito\s*rotativo/i,
    /fatura\s*fechada/i,
    /titular\s*do\s*cart[aã]o/i,
    /final\s*do\s*cart[aã]o/i,
    /parcela\s*\d{1,2}\/\d{1,2}/i,
    /nubank\s*card/i,
    /visa\s*infinite/i,
    /mastercard\s*black/i,
    /altus\s*visa/i,
    /ourocard/i,
    /\bfatura\b/i,
    /\bcart[aã]o\b/i,
  ];

  const bankContentPatterns = [
    /extrato\s*(de\s*conta|banc[áa]rio|consolidado|mensal)?/i,
    /conta\s*corrente/i,
    /conta\s*poupan[çc]a/i,
    /saldo\s*(anterior|atual|dispon[íi]vel|bloqueado|final)/i,
    /lan[çc]amentos\s*da\s*conta/i,
    /rendimentos?\s*autom[áa]ticos?/i,
    /aplica[çc][ãa]o\s*financeira/i,
    /resgate\s*autom[áa]tico/i,
    /ted\s*recebida|ted\s*enviada/i,
    /doc\s*recebido|doc\s*enviado/i,
    /pix\s*recebido|pix\s*enviado/i,
    /ag[êe]ncia\s*:\s*\d+/i,
    /conta\s*corrente\s*:\s*\d+/i,
  ];

  for (const pat of cardContentPatterns) {
    if (pat.test(cleanContent)) cardScore += 2;
  }
  for (const pat of bankContentPatterns) {
    if (pat.test(cleanContent)) bankScore += 2;
  }

  // 3. Pontuação pelo nome do arquivo
  if (/fatura|cartao|cartão|card|credit|visa|master|elo|amex|altus|liv|ourocard|credicard|hipercard/i.test(cleanFilename)) {
    cardScore += 3;
  }
  if (/extrato|conta|statement|saldo|corrente|poupanca|poupança|bb_extrato|itau_extrato/i.test(cleanFilename)) {
    bankScore += 3;
  }

  if (cardScore > bankScore) {
    return {
      sourceType: "CREDIT_CARD",
      label: "Fatura de Cartão de Crédito",
      confidence: cardScore >= 3 ? "HIGH" : "MEDIUM",
      detectedFrom: cleanContent ? "CONTENT_KEYWORDS" : "FILENAME",
    };
  }
  if (bankScore > cardScore) {
    return {
      sourceType: "BANK_STATEMENT",
      label: "Extrato Bancário",
      confidence: bankScore >= 3 ? "HIGH" : "MEDIUM",
      detectedFrom: cleanContent ? "CONTENT_KEYWORDS" : "FILENAME",
    };
  }

  return {
    sourceType: "BANK_STATEMENT",
    label: "Extrato Bancário",
    confidence: "LOW",
    detectedFrom: "FALLBACK",
  };
}

/**
 * Identifica o Mês e Ano de Competência (1 a 12 e YYYY) a partir do nome do arquivo,
 * cabeçalho do conteúdo, lista de transações ou data de fechamento.
 */
export function detectCompetence(
  filename: string,
  userMonth?: number | null,
  userYear?: number | null,
  dtEnd?: Date | null,
  contentPreview?: string,
  transactions?: Array<{ date: Date }>
): CompetenceResult {
  // 1. Se o usuário selecionou explicitamente no formulário
  if (userMonth && userMonth >= 1 && userMonth <= 12 && userYear && userYear >= 2000) {
    return {
      month: userMonth,
      year: userYear,
      monthLabel: MONTH_NAMES_PT[userMonth],
      periodLabel: `${MONTH_NAMES_PT[userMonth]}/${userYear}`,
      detectedFrom: "USER",
    };
  }

  const cleanFilename = (filename || "").toLowerCase();
  const cleanContent = (contentPreview || "").toLowerCase();

  // 2. Procura no conteúdo (cabeçalhos de fatura ou extrato)
  if (cleanContent) {
    // Vencimento de fatura: "Vencimento: 10/02/2026" ou "Vencimento 10-02-2026"
    const vencMatch = cleanContent.match(/vencimento\s*(?:da\s*fatura)?\s*[:\s]\s*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i);
    if (vencMatch) {
      const m = parseInt(vencMatch[2], 10);
      let y = parseInt(vencMatch[3], 10);
      if (y < 100) y += 2000;
      if (m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
        return {
          month: m,
          year: y,
          monthLabel: MONTH_NAMES_PT[m],
          periodLabel: `${MONTH_NAMES_PT[m]}/${y}`,
          detectedFrom: "CONTENT_HEADER",
        };
      }
    }

    // Período no cabeçalho: "Período: 01/01/2026 a 31/01/2026" ou "Extrato referente a Janeiro/2026"
    const periodHeaderMatch = cleanContent.match(
      /(?:fatura|extrato|per[íi]odo|refer[êe]ncia|compet[êe]ncia)\s*(?:de|do|a|ao|referente\s*a)?\s*(jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)[_\s\/-]*(\d{2,4})/i
    );
    if (periodHeaderMatch) {
      const m = MONTH_NAMES_MAP[periodHeaderMatch[1].toLowerCase()];
      let y = parseInt(periodHeaderMatch[2], 10);
      if (y < 100) y += 2000;
      if (m && y >= 2000 && y <= 2100) {
        return {
          month: m,
          year: y,
          monthLabel: MONTH_NAMES_PT[m],
          periodLabel: `${MONTH_NAMES_PT[m]}/${y}`,
          detectedFrom: "CONTENT_HEADER",
        };
      }
    }
  }

  // 3. Procura no nome do arquivo:
  // 3a. Mês por extenso/abreviação seguido de ano (ex: "Jan_26", "Jan-2026", "Janeiro_26", "Fev26")
  const textPattern =
    /(jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?|january|february|march|april|may|june|july|august|september|october|november|december)[_.\s-]*(\d{2,4})/i;
  const textMatch = cleanFilename.match(textPattern);
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
        monthLabel: MONTH_NAMES_PT[month],
        periodLabel: `${MONTH_NAMES_PT[month]}/${year}`,
        detectedFrom: "FILENAME",
      };
    }
  }

  // 3b. Ano seguido de Mês por extenso (ex: "2026_janeiro", "2026-Jan")
  const yearFirstTextPattern =
    /(20\d{2})[_.\s-]*(jan(?:eiro)?|fev(?:ereiro)?|mar(?:[cç]o)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?)/i;
  const yearFirstTextMatch = cleanFilename.match(yearFirstTextPattern);
  if (yearFirstTextMatch) {
    const year = parseInt(yearFirstTextMatch[1], 10);
    const mStr = yearFirstTextMatch[2].toLowerCase();
    const month = MONTH_NAMES_MAP[mStr];
    if (month && year >= 2000 && year <= 2100) {
      return {
        month,
        year,
        monthLabel: MONTH_NAMES_PT[month],
        periodLabel: `${MONTH_NAMES_PT[month]}/${year}`,
        detectedFrom: "FILENAME",
      };
    }
  }

  // 3c. Padrão numérico YYYY-MM ou MM-YYYY ou YYYY_MM
  const numMatch = cleanFilename.match(/(\d{4})[_-](\d{1,2})/) || cleanFilename.match(/(\d{1,2})[_-](\d{4})/);
  if (numMatch) {
    const p1 = parseInt(numMatch[1], 10);
    const p2 = parseInt(numMatch[2], 10);
    if (p1 > 100) {
      if (p2 >= 1 && p2 <= 12) {
        return {
          month: p2,
          year: p1,
          monthLabel: MONTH_NAMES_PT[p2],
          periodLabel: `${MONTH_NAMES_PT[p2]}/${p1}`,
          detectedFrom: "FILENAME",
        };
      }
    } else {
      if (p1 >= 1 && p1 <= 12) {
        return {
          month: p1,
          year: p2,
          monthLabel: MONTH_NAMES_PT[p1],
          periodLabel: `${MONTH_NAMES_PT[p1]}/${p2}`,
          detectedFrom: "FILENAME",
        };
      }
    }
  }

  // 3d. Padrão YYYYMM numérico contínuo no nome (ex: "extrato_202601.ofx")
  const compactNumMatch = cleanFilename.match(/(20\d{2})(0[1-9]|1[0-2])/);
  if (compactNumMatch) {
    const year = parseInt(compactNumMatch[1], 10);
    const month = parseInt(compactNumMatch[2], 10);
    return {
      month,
      year,
      monthLabel: MONTH_NAMES_PT[month],
      periodLabel: `${MONTH_NAMES_PT[month]}/${year}`,
      detectedFrom: "FILENAME",
    };
  }

  // 4. Se houver transações carregadas, calcula o mês/ano predominante
  if (transactions && transactions.length > 0) {
    const monthCounts: Record<string, number> = {};
    for (const tx of transactions) {
      const d = tx.date instanceof Date ? tx.date : new Date(tx.date);
      if (!isNaN(d.getTime())) {
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      }
    }
    const sorted = Object.entries(monthCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [dominantKey] = sorted[0];
      const [dYearStr, dMonthStr] = dominantKey.split("-");
      const dYear = parseInt(dYearStr, 10);
      const dMonth = parseInt(dMonthStr, 10);
      if (dMonth >= 1 && dMonth <= 12 && dYear >= 2000) {
        return {
          month: dMonth,
          year: dYear,
          monthLabel: MONTH_NAMES_PT[dMonth],
          periodLabel: `${MONTH_NAMES_PT[dMonth]}/${dYear}`,
          detectedFrom: "TRANSACTIONS_DOMINANT",
        };
      }
    }
  }

  // 5. Se houver data de fechamento ou período (dtEnd)
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
        monthLabel: MONTH_NAMES_PT[nextMonth],
        periodLabel: `${MONTH_NAMES_PT[nextMonth]}/${nextYear}`,
        detectedFrom: "CLOSING_DATE",
      };
    } else {
      return {
        month: endMonth,
        year: endYear,
        monthLabel: MONTH_NAMES_PT[endMonth],
        periodLabel: `${MONTH_NAMES_PT[endMonth]}/${endYear}`,
        detectedFrom: "CLOSING_DATE",
      };
    }
  }

  // 6. Fallback para data atual
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  return {
    month: currentMonth,
    year: currentYear,
    monthLabel: MONTH_NAMES_PT[currentMonth],
    periodLabel: `${MONTH_NAMES_PT[currentMonth]}/${currentYear}`,
    detectedFrom: "FALLBACK",
  };
}

/**
 * Função utilitária unificada para detectar Tipo e Competência de uma vez só.
 */
export function detectFileMetadata(
  filename: string,
  contentPreview?: string,
  options?: {
    userMonth?: number | null;
    userYear?: number | null;
    userSourceType?: string;
    dtEnd?: Date | null;
    transactions?: Array<{ date: Date }>;
  }
): FileMetadataResult {
  const typeRes = detectDocumentType(filename, contentPreview, options?.userSourceType);
  const compRes = detectCompetence(
    filename,
    options?.userMonth,
    options?.userYear,
    options?.dtEnd,
    contentPreview,
    options?.transactions
  );

  return {
    filename,
    sourceType: typeRes.sourceType,
    sourceTypeLabel: typeRes.label,
    month: compRes.month,
    year: compRes.year,
    monthLabel: compRes.monthLabel,
    periodLabel: compRes.periodLabel,
    detectedFrom: {
      sourceType: typeRes.detectedFrom,
      competence: compRes.detectedFrom,
    },
  };
}
