import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Users,
  Bed,
  Bath,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  Sparkles,
  Search,
} from "lucide-react";
import { getStateBySlug, normalizeSlug } from "@/lib/geoUtils";

export const dynamic = "force-dynamic";

async function getSeasonalPropertiesByStateSlug(stateSlug: string) {
  const stateInfo = getStateBySlug(stateSlug);
  if (!stateInfo) return null;

  const properties = await prisma.property.findMany({
    where: {
      listingType: "ALUGUEL_TEMPORADA",
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const matchingProperties = properties.filter((p) => {
    if (!p.state) return false;
    const pStateNorm = normalizeSlug(p.state);
    return (
      pStateNorm === stateInfo.slug ||
      pStateNorm === normalizeSlug(stateInfo.name) ||
      p.state.trim().toUpperCase() === stateInfo.uf
    );
  });

  return {
    stateInfo,
    properties: matchingProperties,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const result = await getSeasonalPropertiesByStateSlug(state);

  if (!result) {
    return {
      title: "Estado não encontrado | RealStock",
    };
  }

  const { stateInfo, properties } = result;
  const count = properties.length;
  const canonicalUrl = `https://www.realstock.com.br/aluguel-temporada/${stateInfo.slug}`;

  const title = `Aluguel por Temporada no ${stateInfo.name} (CE): Casas de Praia e Flats | RealStock`;
  const description = `Encontre ${count} acomodações para aluguel por temporada no ${stateInfo.name}. Casas de praia em Flecheiras e Trairi, apartamentos com vista mar na Praia do Futuro e flats em Fortaleza direto com proprietários no RealStock!`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      locale: "pt_BR",
      siteName: "RealStock",
      images: [
        {
          url: properties[0]?.images[0]?.imageUrl || "https://www.realstock.com.br/icon.png",
          width: 800,
          height: 600,
          alt: `Aluguel por Temporada no ${stateInfo.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [properties[0]?.images[0]?.imageUrl || "https://www.realstock.com.br/icon.png"],
    },
  };
}

export default async function StateSeasonalLandingPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const result = await getSeasonalPropertiesByStateSlug(state);

  if (!result) {
    notFound();
  }

  const { stateInfo, properties } = result;
  const siteUrl = "https://www.realstock.com.br";
  const canonicalUrl = `${siteUrl}/aluguel-temporada/${stateInfo.slug}`;

  // Schema ItemList
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Aluguel por Temporada no ${stateInfo.name} - ${stateInfo.uf}`,
    "description": `Catálogo de casas de praia, apartamentos e flats para aluguel por temporada no ${stateInfo.name}`,
    "url": canonicalUrl,
    "numberOfItems": properties.length,
    "itemListElement": properties.map((p, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${siteUrl}/imovel/${p.id}`,
      "name": p.title,
      "image": p.images[0]?.imageUrl || `${siteUrl}/icon.png`,
    })),
  };

  // Schema BreadcrumbList
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Início",
        "item": siteUrl,
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Aluguel por Temporada",
        "item": `${siteUrl}/aluguel-temporada`,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": `${stateInfo.name} (${stateInfo.uf})`,
        "item": canonicalUrl,
      },
    ],
  };

  // Schema FAQPage
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Como alugar por temporada no ${stateInfo.name} pelo RealStock?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Selecione a acomodação desejada no catálogo do ${stateInfo.name}, defina suas datas de check-in e check-out, verifique o valor total com diárias e taxa de limpeza e envie sua solicitação de pré-reserva. A confirmação é rápida e o pagamento seguro via Pix ou Cartão.`,
        },
      },
      {
        "@type": "Question",
        "name": `Quais as melhores praias para aluguel de temporada no ${stateInfo.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `No Ceará, destacam-se a Praia de Flecheiras e Guajiru (em Trairi) para quem busca descanso, gastronomia à beira-mar e ventos ideais para kitesurf, e Fortaleza (Praia do Futuro e Meireles) para combinar praia urbana com vida noturna e facilidades.`,
        },
      },
      {
        "@type": "Question",
        "name": `O RealStock cobra taxas de serviço abusivas como outras plataformas?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Não! O RealStock foi criado com o menor custo operacional do mercado. A negociação é transparente, sem intermediários inflacionando os preços das diárias.`,
        },
      },
      {
        "@type": "Question",
        "name": `Os calendários de disponibilidade são sincronizados?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Sim! Nossos imóveis possuem sincronização inteligente via iCal e integração com Google Vacation Rentals, evitando qualquer sobreposição ou duplicidade de reservas.`,
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb Visual */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs md:text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Início
          </Link>
          <span>/</span>
          <Link href="/aluguel-temporada" className="hover:text-white transition-colors">
            Aluguel por Temporada
          </Link>
          <span>/</span>
          <span className="text-white font-medium">{stateInfo.name} ({stateInfo.uf})</span>
        </nav>

        {/* Hero Section */}
        <header className="mb-12 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Calendar size={14} /> Férias & Temporada no {stateInfo.name}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Aluguel por Temporada no <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{stateInfo.name}</span> ({stateInfo.uf})
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
              Reserve casas de praia pé na areia, apartamentos com vista para o mar e flats acolhedores no litoral do {stateInfo.name}. Negocie direto com anfitriões com calendário em tempo real e sem taxas ocultas abusivas.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs md:text-sm">
                Acomodações disponíveis: <strong className="text-white">{properties.length} imóveis</strong>
              </span>
              <Link
                href={`/imoveis/${stateInfo.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
              >
                Ver Catálogo Geral (Venda + Temporada)
              </Link>
            </div>
          </div>
        </header>

        {/* Grade de Imóveis para Temporada */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Acomodações em Destaque no {stateInfo.name}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Mostrando {properties.length} opção(ões) para suas férias e descanso no litoral cearense.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => {
              const imageUrl =
                property.images[0]?.imageUrl ||
                "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

              return (
                <Link
                  key={property.id}
                  href={`/imovel/${property.id}`}
                  className="group flex flex-col rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-800">
                    <img
                      src={imageUrl}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md bg-sky-500/90 text-white shadow-md">
                        Temporada
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-emerald-400 font-bold text-sm">
                      R$ {Number(property.price).toLocaleString("pt-BR")}
                      <span className="text-xs text-slate-300 font-normal"> /diária</span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {property.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-500" />
                        {[property.neighborhood, property.city, property.state].filter(Boolean).join(", ")}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-3">
                        {property.maxGuests ? (
                          <span className="flex items-center gap-1" title="Hóspedes">
                            <Users size={14} className="text-slate-400" />
                            Até {property.maxGuests}
                          </span>
                        ) : null}
                        {property.bedrooms ? (
                          <span className="flex items-center gap-1" title="Quartos">
                            <Bed size={14} className="text-slate-400" />
                            {property.bedrooms} qts
                          </span>
                        ) : null}
                        {property.bathrooms ? (
                          <span className="flex items-center gap-1" title="Banheiros">
                            <Bath size={14} className="text-slate-400" />
                            {property.bathrooms} banh
                          </span>
                        ) : null}
                      </div>

                      <span className="flex items-center gap-1 text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                        Ver Datas <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Diferenciais da Reserva de Temporada */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">
            Por que Alugar por Temporada no {stateInfo.name} pelo RealStock?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CreditCard size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Tarifas Transparentes</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você sabe exatamente o que está pagando desde a primeira tela, com cálculo automático de diárias e taxa de limpeza.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Anfitriões Verificados</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fotos reais dos imóveis, localização exata e chat direto com o proprietário para tirar todas as dúvidas antes da viagem.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Calendar size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Calendário Sincronizado</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Datas em tempo real integradas a calendários globais para garantir que o imóvel escolhido esteja livre no período selecionado.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Estruturado de Temporada */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/30 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-emerald-400" /> Perguntas Frequentes sobre Aluguel de Temporada no {stateInfo.name}
          </h2>

          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Como alugar por temporada no {stateInfo.name} pelo RealStock?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Selecione a acomodação desejada no catálogo do {stateInfo.name}, defina suas datas de check-in e check-out, verifique o valor total com diárias e taxa de limpeza e envie sua solicitação de pré-reserva. A confirmação é rápida e o pagamento seguro via Pix ou Cartão.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Quais as melhores praias para aluguel de temporada no {stateInfo.name}?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                No Ceará, destacam-se a Praia de Flecheiras e Guajiru (em Trairi) para quem busca descanso, gastronomia à beira-mar e ventos ideais para kitesurf, e Fortaleza (Praia do Futuro e Meireles) para combinar praia urbana com vida noturna e facilidades.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">O RealStock cobra taxas de serviço abusivas como outras plataformas?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Não! O RealStock foi criado com o menor custo operacional do mercado. A negociação é transparente, sem intermediários inflacionando os preços das diárias.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Os calendários de disponibilidade são sincronizados?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Sim! Nossos imóveis possuem sincronização inteligente via iCal e integração com Google Vacation Rentals, evitando qualquer sobreposição ou duplicidade de reservas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
