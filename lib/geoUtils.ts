export function normalizeSlug(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface StateInfo {
  name: string;
  uf: string;
  slug: string;
  capital: string;
  region: string;
  description: string;
}

export const BRAZIL_STATES: Record<string, StateInfo> = {
  "ceara": {
    name: "Ceará",
    uf: "CE",
    slug: "ceara",
    capital: "Fortaleza",
    region: "Nordeste",
    description: "Principal polo imobiliário da RealStock com casas em condomínio no Eusébio, apartamentos de alto padrão em Fortaleza e casas de praia em Flecheiras, Trairi e Aquiraz com negociação direta.",
  },
  "espirito-santo": {
    name: "Espírito Santo",
    uf: "ES",
    slug: "espirito-santo",
    capital: "Vitória",
    region: "Sudeste",
    description: "Apartamentos na capital Vitória (Praia do Canto, Barro Vermelho, Ilha do Boi) e oportunidades no litoral norte em Conceição da Barra e Itaúnas.",
  },
  "sao-paulo": {
    name: "São Paulo",
    uf: "SP",
    slug: "sao-paulo",
    capital: "São Paulo",
    region: "Sudeste",
    description: "Apartamentos, casas e imóveis comerciais na capital paulista, litoral e interior.",
  },
  "rio-de-janeiro": {
    name: "Rio de Janeiro",
    uf: "RJ",
    slug: "rio-de-janeiro",
    capital: "Rio de Janeiro",
    region: "Sudeste",
    description: "Casas, coberturas e flats na capital e regiões litorâneas fluminenses.",
  },
  "rio-grande-do-norte": {
    name: "Rio Grande do Norte",
    uf: "RN",
    slug: "rio-grande-do-norte",
    capital: "Natal",
    region: "Nordeste",
    description: "Imóveis residenciais e para temporada em Natal, Parnamirim e praias potiguares.",
  },
  "bahia": {
    name: "Bahia",
    uf: "BA",
    slug: "bahia",
    capital: "Salvador",
    region: "Nordeste",
    description: "Apartamentos em Salvador e casas de praia na Linha Verde e Litoral Norte baiano.",
  },
  "pernambuco": {
    name: "Pernambuco",
    uf: "PE",
    slug: "pernambuco",
    capital: "Recife",
    region: "Nordeste",
    description: "Imóveis na região metropolitana de Recife e casas para temporada em Porto de Galinhas.",
  },
  "santa-catarina": {
    name: "Santa Catarina",
    uf: "SC",
    slug: "santa-catarina",
    capital: "Florianópolis",
    region: "Sul",
    description: "Imóveis de alto padrão e temporada em Florianópolis, Balneário Camboriú e litoral catarinense.",
  },
};

export const UF_TO_SLUG: Record<string, string> = {
  "ce": "ceara",
  "es": "espirito-santo",
  "sp": "sao-paulo",
  "rj": "rio-de-janeiro",
  "rn": "rio-grande-do-norte",
  "ba": "bahia",
  "pe": "pernambuco",
  "sc": "santa-catarina",
  "mg": "minas-gerais",
  "pr": "parana",
  "rs": "rio-grande-do-sul",
  "go": "goias",
  "df": "distrito-federal",
};

export function getStateBySlug(slug: string): StateInfo | null {
  if (!slug) return null;
  const normalized = normalizeSlug(slug);

  // Busca direta pela chave do slug
  if (BRAZIL_STATES[normalized]) {
    return BRAZIL_STATES[normalized];
  }

  // Busca por UF (ex: "ce" -> "ceara")
  const slugFromUf = UF_TO_SLUG[normalized];
  if (slugFromUf && BRAZIL_STATES[slugFromUf]) {
    return BRAZIL_STATES[slugFromUf];
  }

  // Busca reversa por nome normalizado
  for (const state of Object.values(BRAZIL_STATES)) {
    if (normalizeSlug(state.name) === normalized || state.uf.toLowerCase() === normalized) {
      return state;
    }
  }

  return null;
}

export function isStateSlug(slug: string): boolean {
  return getStateBySlug(slug) !== null;
}
