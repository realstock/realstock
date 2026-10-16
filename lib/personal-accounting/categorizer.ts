/**
 * Motor de Categorização Inteligente para Contabilidade Pessoal
 * Classifica lançamentos em categorias padrão brasileiras com regras de alta precisão
 * e suporte a fallback com IA (Gemini).
 */

export const STANDARD_CATEGORIES = [
  "Alimentação & Supermercado",
  "Moradia & Contas",
  "Transporte & Combustível",
  "Saúde & Farmácia",
  "Educação & Cursos",
  "Lazer & Streaming",
  "Compras & Varejo",
  "Serviços & Assinaturas",
  "Fatura de Cartão",
  "Investimentos",
  "Empréstimos",
  "Renda / Salário",
  "Outros",
] as const;

export type PersonalCategory = typeof STANDARD_CATEGORIES[number];

const CATEGORY_RULES: Array<{
  category: PersonalCategory;
  patterns: RegExp[];
}> = [
  {
    category: "Fatura de Cartão",
    patterns: [
      /fatura\s*(do)?\s*cart[aã]o/i,
      /pag(to|amento)?\s*(de|da)?\s*fatura/i,
      /pag(to)?\s*cart[aã]o/i,
      /liquidacao\s*fatura/i,
      /deb\s*aut\s*cart[aã]o/i,
      /fatura\s*nubank/i,
      /fatura\s*itau/i,
      /fatura\s*bradesco/i,
      /fatura\s*santander/i,
      /fatura\s*inter/i,
      /fatura\s*c6/i,
      /fatura\s*xp/i,
    ],
  },
  {
    category: "Alimentação & Supermercado",
    patterns: [
      /ifood/i,
      /rappi/i,
      /z[eé]\s*delivery/i,
      /carrefour/i,
      /p[aã]o\s*de\s*a[cç][uú]car/i,
      /assai|assa[íi]/i,
      /atacad[aã]o/i,
      /extra\s*(hiper|super|mercado)?/i,
      /zaffari/i,
      /mambo/i,
      /dia\s*(brasil|mercado)?/i,
      /mercado|supermercado|hipermercado/i,
      /hortifruti|sacol[aã]o/i,
      /padaria|panificadora|confeitaria/i,
      /restaurante|churrascaria|pizzaria|hamburgueria|lanchonete|bar\b|bistr[oô]/i,
      /mc\s*donald|mcdonalds|burguer\s*king|burger\s*king|subway|habib|outback|madero|coco\s*bambu/i,
      /starbucks|caf[eé]|coffee/i,
      /a[cç]ougue|frigorifico/i,
      /sorveteria|gelato|bacio\s*di\s*latte/i,
    ],
  },
  {
    category: "Moradia & Contas",
    patterns: [
      /enel|cpfl|light|cemig|coelba|energisa|elektro/i,
      /sabesp|copasa|sanepar|cedae|compesa/i,
      /comg[aá]s|naturgy|\bg[aá]s\b|botij[aã]o/i,
      /condom[íi]nio|cond\b/i,
      /aluguel|loca[cç][aã]o|quinto\s*andar|loft/i,
      /iptu/i,
      /claro|vivo|tim|oi\b|embratel/i,
      /internet|fibra|banda\s*larga/i,
      /energia\s*el[eé]trica/i,
      /saneamento|\b[aá]gua\b/i,
    ],
  },
  {
    category: "Transporte & Combustível",
    patterns: [
      /uber/i,
      /99\s*(app|pop|t[aá]xi|tecnologia)?/i,
      /indrive/i,
      /posto|gasolina|etanol|combustivel|combust[íi]vel/i,
      /ipiranga|shell|petrobras|br\s*distribuidora|ale\s*combustiveis/i,
      /sem\s*parar|veloe|conectcar|taggy|move\s*mais/i,
      /ped[aá]gio|rodovia|ecovias|autoban|ccr/i,
      /estacionamento|estapar|park/i,
      /metr[oô]|cptm|sptrans|bilhete\s*[uú]nico|onibus|[oô]nibus/i,
      /latam|gol\s*linhas|azul\s*linhas|passagem\s*a[eé]rea/i,
      /oficina|mecanica|mec[aâ]nica|auto\s*center|pneus/i,
      /ipva|detran|licenciamento/i,
    ],
  },
  {
    category: "Saúde & Farmácia",
    patterns: [
      /droga\s*raia|drogasil/i,
      /drogaria\s*s[aã]o\s*paulo|drogaria\s*pacheco/i,
      /pague\s*menos|panvel|farm[aá]cia|drogaria/i,
      /unimed|amil|sul\s*am[eé]rica|bradesco\s*sa[uú]de|notredame|interm[eé]dica/i,
      /hospital|cl[íi]nica|laborat[oó]rio|fleury|dasa|delboni|lavoisier/i,
      /consulta|m[eé]dico|dentista|odonto|psic[oó]log|fisioterapia/i,
      /otica|[oó]tica|oftalmo/i,
    ],
  },
  {
    category: "Educação & Cursos",
    patterns: [
      /escola|col[eé]gio|faculdade|universidade/i,
      /curso|educa[cç][aã]o|mensalidade\s*escolar/i,
      /alura|udemy|coursera|hotmart|kiwify|eduzz/i,
      /livraria|saraiva|cultura\s*livraria/i,
      /idiomas|ingl[eê]s|wizard|cna|fisk|ccaa/i,
    ],
  },
  {
    category: "Lazer & Streaming",
    patterns: [
      /netflix/i,
      /spotify/i,
      /amazon\s*prime|prime\s*video/i,
      /disney\s*(plus|\+)?/i,
      /hbo\s*max|max\b/i,
      /globoplay/i,
      /youtube\s*(premium|member)?/i,
      /deezer|apple\s*music/i,
      /cinema|cinemark|cinepolis|kinoplex|ingresso\.com/i,
      /sympla|eventim|ticket360|show\b|teatro/i,
      /hotel|pousada|booking|airbnb|decolar|hoteis\.com/i,
      /viagem|resort|turismo/i,
      /parque|clube|academia|smart\s*fit|bluefit/i,
    ],
  },
  {
    category: "Compras & Varejo",
    patterns: [
      /amazon\s*(br|com)?/i,
      /mercado\s*livre|mercadolivre|mercadopago\s*\*compras/i,
      /shopee/i,
      /shein/i,
      /aliexpress/i,
      /magalu|magazine\s*luiza/i,
      /casas\s*bahia|ponto\s*frio|extra\.com/i,
      /fast\s*shop/i,
      /zara|renner|riachuelo|c&a|hering/i,
      /nike|adidas|centauro|decathlon/i,
      /botic[aá]rio|natura|sephora/i,
      /petz|cobasi|pet\s*shop/i,
    ],
  },
  {
    category: "Serviços & Assinaturas",
    patterns: [
      /apple(\.com)?|itunes|icloud/i,
      /google\s*(storage|one|cloud|play)?/i,
      /microsoft|msft|office\s*365/i,
      /openai|chatgpt/i,
      /anthropic|claude/i,
      /vercel|supabase|github|aws|digitalocean/i,
      /adobe|creative\s*cloud/i,
      /canva|figma|notion/i,
      /linkedin/i,
      /lavanderia|costura|chaveiro|sapataria/i,
      /cart[oó]rio|correios/i,
    ],
  },
  {
    category: "Investimentos",
    patterns: [
      /tesouro\s*direto/i,
      /xp\s*investimentos|xp\s*gestao/i,
      /btg\s*pactual/i,
      /nu\s*invest|nuinvest/i,
      /rico\s*investimentos/i,
      /clear\s*corretora/i,
      /[aá]gora\s*investimentos/i,
      /inter\s*dtvm/i,
      /aplica[cç][aã]o|investimento|fundo\s*de\s*invest/i,
      /cdb|lci|lca|debenture|a[cç][oõ]es/i,
      /b3\s*cetip/i,
    ],
  },
  {
    category: "Renda / Salário",
    patterns: [
      /sal[aá]rio|folha\s*de\s*pagamento|remunera[cç][aã]o/i,
      /ted\s*recebida|doc\s*recebido|pix\s*recebido/i,
      /transf\s*recebida|transferencia\s*recebida/i,
      /proventos|dividendos|jcp\s*creditado|rendimento/i,
      /resgate\s*investimento|resgate\s*aplic/i,
      /adiantamento\s*salarial/i,
      /faturamento|honor[aá]rios/i,
    ],
  },
  {
    category: "Empréstimos",
    patterns: [
      /empr[eé]stimo|financiamento|consorcio|cons[oó]rcio|parcela\s*empr/i,
      /5691/i,
    ],
  },
];

/**
 * Classifica uma transação com base na descrição, tipo, regras e valor.
 */
export function categorizeTransaction(
  description: string,
  type: "INCOME" | "EXPENSE",
  sourceType: "BANK_STATEMENT" | "CREDIT_CARD" = "BANK_STATEMENT",
  amount?: number
): PersonalCategory {
  const clean = description.trim();

  // Se o valor for a parcela do empréstimo de curto prazo (~R$ 5.691,46)
  if (type === "EXPENSE" && amount !== undefined) {
    if (Math.abs(amount - 5691.46) <= 2.0) {
      return "Empréstimos";
    }
  }

  // 1. Se for entrada de dinheiro (INCOME)
  if (type === "INCOME") {
    // Se for cartão de crédito, crédito significa estorno ou pagamento da fatura
    if (sourceType === "CREDIT_CARD") {
      return "Fatura de Cartão";
    }
    // No extrato, testa se é investimento/proventos ou resgate/aplicação automática
    if (/dividend|jcp|rendimento|resgate|rende\s*f[aá]cil|rende\s*facil|aplica[cç][aã]o\s*autom/i.test(clean)) {
      return "Investimentos";
    }
    return "Renda / Salário";
  }

  // 2. Se for saída / despesa, verifica no dicionário de padrões
  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(clean)) {
        return rule.category;
      }
    }
  }

  return "Outros";
}

/**
 * Categorização em lote usando Gemini caso haja itens "Outros" não identificados.
 */
export async function batchCategorizeWithAI(
  transactions: Array<{ id: string; description: string; amount: number }>
): Promise<Record<string, PersonalCategory>> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey || transactions.length === 0) return {};

  try {
    const prompt = `Você é um especialista em contabilidade e finanças pessoais no Brasil.
Classifique cada um dos lançamentos financeiros abaixo EXATAMENTE em uma das seguintes categorias:
${STANDARD_CATEGORIES.join(", ")}

Lista de lançamentos:
${JSON.stringify(transactions.map((t) => ({ id: t.id, desc: t.description, val: t.amount })))}

Responda APENAS um JSON válido no formato:
{
  "classifications": [
    { "id": "id_da_transacao", "category": "Categoria Exata" }
  ]
}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) return {};
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return {};

    const parsed = JSON.parse(rawText);
    const result: Record<string, PersonalCategory> = {};

    if (Array.isArray(parsed?.classifications)) {
      parsed.classifications.forEach((item: any) => {
        if (item.id && STANDARD_CATEGORIES.includes(item.category)) {
          result[item.id] = item.category;
        }
      });
    }

    return result;
  } catch (err) {
    console.error("AI Categorization Error:", err);
    return {};
  }
}
