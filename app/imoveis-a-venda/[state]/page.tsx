import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Handshake,
  ShieldCheck,
  Search,
} from "lucide-react";
import { getStateBySlug, normalizeSlug } from "@/lib/geoUtils";

export const dynamic = "force-dynamic";

async function getSalePropertiesByStateSlug(stateSlug: string) {
  const stateInfo = getStateBySlug(stateSlug);
  if (!stateInfo) return null;

  const properties = await prisma.property.findMany({
    where: {
      listingType: "COMPRA_VENDA",
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
  const result = await getSalePropertiesByStateSlug(state);

  if (!result) {
    return {
      title: "Estado não encontrado | RealStock",
    };
  }

  const { stateInfo, properties } = result;
  const count = properties.length;
  const canonicalUrl = `https://www.realstock.com.br/imoveis-a-venda/${stateInfo.slug}`;

  const title = `Imóveis à Venda no ${stateInfo.name} (CE): Casas, Apartamentos e Terrenos | RealStock`;
  const description = `Encontre ${count} imóveis à venda no ${stateInfo.name}. Casas em condomínio fechado no Eusébio, apartamentos de luxo em Fortaleza e terrenos de praia em Flecheiras e Trairi direto com proprietários no RealStock!`;

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
          alt: `Imóveis à Venda no ${stateInfo.name}`,
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

export default async function StateSaleLandingPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const result = await getSalePropertiesByStateSlug(state);

  if (!result) {
    notFound();
  }

  const { stateInfo, properties } = result;
  const siteUrl = "https://www.realstock.com.br";
  const canonicalUrl = `${siteUrl}/imoveis-a-venda/${stateInfo.slug}`;

  // Schema ItemList
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Imóveis à Venda no ${stateInfo.name} - ${stateInfo.uf}`,
    "description": `Catálogo de casas, apartamentos e terrenos à venda no ${stateInfo.name}`,
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
        "name": "Imóveis à Venda",
        "item": `${siteUrl}/imoveis-a-venda`,
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
        "name": `Como comprar um imóvel à venda no ${stateInfo.name} pelo RealStock?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Acesse o catálogo de imóveis no ${stateInfo.name}, escolha a casa, apartamento ou terreno desejado e faça sua proposta através do Livro de Ofertas em tempo real. A negociação é direta com o proprietário, com segurança jurídica e sem intermediários desnecessários.`,
        },
      },
      {
        "@type": "Question",
        "name": `Quais as melhores cidades para comprar imóveis no ${stateInfo.name}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `No Ceará, os principais polos imobiliários são Fortaleza (para apartamentos de alto padrão na Beira-Mar, Meireles e Cocó), Eusébio (polo de condomínios horizontais como Alphaville e casas duplex com lazer completo) e Trairi/Flecheiras (para casas de veraneio e lotes com valorização litorânea).`,
        },
      },
      {
        "@type": "Question",
        "name": `Os imóveis à venda no ${stateInfo.name} aceitam financiamento bancário?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Sim! Na página de cada imóvel você encontra a informação de aceitação de financiamento pelos bancos Caixa, Itaú, Santander, Bradesco e Banco do Brasil, além de opções que aceitam permuta.`,
        },
      },
      {
        "@type": "Question",
        "name": `Posso negociar e enviar contraproposta online?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `Sim! O RealStock possui o Livro de Ofertas transparente onde compradores podem enviar suas ofertas de compra diretamente aos anunciantes e acompanhar o histórico de lances em tempo real.`,
        },
      },
    ],
  };

  // Cidades do Ceará em destaque para venda
  const topCities = [
    { name: "Fortaleza (CE)", slug: "fortaleza", desc: "Apartamentos na Beira-Mar, Meireles, Cocó, Guararapes e Praia do Futuro" },
    { name: "Eusébio (CE)", slug: "eusebio", desc: "Casas em condomínio fechado, duplex e lotes no Alphaville Ceará" },
    { name: "Trairi / Flecheiras (CE)", slug: "trairi", desc: "Casas de praia, vilas de veraneio e terrenos no litoral cearense" },
  ];

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
          <Link href="/imoveis-a-venda" className="hover:text-white transition-colors">
            Imóveis à Venda
          </Link>
          <span>/</span>
          <span className="text-white font-medium">{stateInfo.name} ({stateInfo.uf})</span>
        </nav>

        {/* Hero Section */}
        <header className="mb-12 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Building2 size={14} /> Venda de Imóveis no {stateInfo.name}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Imóveis à Venda no <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">{stateInfo.name}</span> ({stateInfo.uf})
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
              Encontre casas em condomínio fechado, apartamentos de alto padrão, coberturas e terrenos para comprar no {stateInfo.name}. Negocie direto com os proprietários através do livro de ofertas em tempo real com total transparência e segurança jurídica.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs md:text-sm">
                Total à venda: <strong className="text-white">{properties.length} imóveis</strong>
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

        {/* Cidades em Destaque no Ceará */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <MapPin className="text-blue-400" size={20} /> Cidades com Imóveis à Venda no {stateInfo.name}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Explore as principais regiões metropolitanas e polos de valorização do estado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topCities.map((city) => (
              <Link
                key={city.slug}
                href={`/imoveis/${city.slug}?tipo=venda`}
                className="group p-5 rounded-2xl border border-white/10 bg-slate-900/50 hover:bg-slate-900 hover:border-blue-500/40 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                    {city.name}
                  </h3>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {city.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Grade de Imóveis à Venda */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Oportunidades à Venda no {stateInfo.name}
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Mostrando {properties.length} imóvel(is) cadastrados com negociação direta.
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
                  className="group flex flex-col rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden hover:border-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-800">
                    <img
                      src={imageUrl}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md bg-blue-600/90 text-white shadow-md">
                        À Venda
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md text-emerald-400 font-bold text-sm">
                      R$ {Number(property.price).toLocaleString("pt-BR")}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
                        {property.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-500" />
                        {[property.neighborhood, property.city, property.state].filter(Boolean).join(", ")}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                      <div className="flex items-center gap-3">
                        {property.area ? (
                          <span className="flex items-center gap-1" title="Área útil">
                            <Maximize2 size={14} className="text-slate-400" />
                            {property.area}m²
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

                      <span className="flex items-center gap-1 text-blue-400 font-semibold group-hover:translate-x-1 transition-transform">
                        Ver Oferta <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Vantagens de Comprar no Ceará pelo RealStock */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">
            Vantagens de Comprar Imóveis no {stateInfo.name} pelo RealStock
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Livro de Ofertas Transparente</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Envie suas propostas diretamente aos proprietários e acompanhe respostas e contrapropostas em tempo real.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Handshake size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Sem Burocracia Desnecessária</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Converse com corretores e proprietários qualificados no Ceará, combinando vistorias e condições de pagamento diretamente.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Localização Exata e Relevo 3D</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Visualize a posição precisa no mapa Cesium 3D com satélite, topografia e proximidade à praia antes de agendar a visita.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Estruturado de Compra e Venda no Ceará */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/30 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-blue-400" /> Dúvidas Frequentes sobre Compra e Venda no {stateInfo.name}
          </h2>

          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Como comprar um imóvel à venda no {stateInfo.name} pelo RealStock?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Acesse o catálogo de imóveis no {stateInfo.name}, escolha a casa, apartamento ou terreno desejado e faça sua proposta através do Livro de Ofertas em tempo real. A negociação é direta com o proprietário, com segurança jurídica e sem intermediários desnecessários.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Quais as melhores cidades para comprar imóveis no {stateInfo.name}?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                No Ceará, os principais polos imobiliários são Fortaleza (para apartamentos de alto padrão na Beira-Mar, Meireles e Cocó), Eusébio (polo de condomínios horizontais como Alphaville e casas duplex com lazer completo) e Trairi/Flecheiras (para casas de veraneio e lotes com valorização litorânea).
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Os imóveis à venda no {stateInfo.name} aceitam financiamento bancário?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Sim! Na página de cada imóvel você encontra a informação de aceitação de financiamento pelos bancos Caixa, Itaú, Santander, Bradesco e Banco do Brasil, além de opções que aceitam permuta.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Posso negociar e enviar contraproposta online?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Sim! O RealStock possui o Livro de Ofertas transparente onde compradores podem enviar suas ofertas de compra diretamente aos anunciantes e acompanhar o histórico de lances em tempo real.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
