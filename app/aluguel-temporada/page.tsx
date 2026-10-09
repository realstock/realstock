import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
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

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aluguel por Temporada no Brasil: Casas de Praia, Flats e Chalés | RealStock",
  description:
    "Encontre casas de praia, apartamentos e flats para aluguel por temporada no Brasil. Reserve online direto com o anfitrião, sem burocracia, com fotos reais e pagamento seguro no RealStock.",
  alternates: {
    canonical: "https://www.realstock.com.br/aluguel-temporada",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Aluguel por Temporada no Brasil: Casas de Praia, Flats e Chalés | RealStock",
    description:
      "Encontre casas de praia, apartamentos e chalés para temporada no Brasil direto com proprietários. Fotos, valores e reserva transparente.",
    url: "https://www.realstock.com.br/aluguel-temporada",
    type: "website",
    locale: "pt_BR",
    siteName: "RealStock",
    images: [
      {
        url: "https://www.realstock.com.br/icon.png",
        width: 512,
        height: 512,
        alt: "Aluguel por Temporada no Brasil - RealStock",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aluguel por Temporada no Brasil | RealStock",
    description: "Casas de praia, apartamentos e chalés direto com anfitriões no RealStock.",
    images: ["https://www.realstock.com.br/icon.png"],
  },
};

async function getSeasonalProperties() {
  try {
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
      take: 60,
    });
    return properties;
  } catch (error) {
    console.error("Erro ao buscar imóveis de temporada:", error);
    return [];
  }
}

export default async function AluguelTemporadaPage() {
  const properties = await getSeasonalProperties();
  const siteUrl = "https://www.realstock.com.br";
  const canonicalUrl = `${siteUrl}/aluguel-temporada`;

  // Dados estruturados Schema.org
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
        "item": canonicalUrl,
      },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Imóveis para Aluguel por Temporada no Brasil",
    "description": "Casas de praia, flats e chalés para aluguel de temporada",
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

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Como alugar um imóvel de temporada no RealStock?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Basta navegar pelos anúncios de temporada, selecionar as datas desejadas no calendário da página do imóvel e enviar seu pedido de pré-reserva direto ao anfitrião.",
        },
      },
      {
        "@type": "Question",
        "name": "Como funciona o pagamento e caução no RealStock?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "O pagamento é combinado de forma transparente e segura, geralmente com sinal via Pix para bloqueio das datas e o restante pago conforme as condições estipuladas pelo proprietário.",
        },
      },
      {
        "@type": "Question",
        "name": "Quais tipos de imóveis de temporada estão disponíveis?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Você encontra casas de praia, apartamentos e studios urbanos, flats e apart-hotéis, chalés de serra e casas em condomínios fechados nos principais destinos do Brasil.",
        },
      },
      {
        "@type": "Question",
        "name": "Como anunciar minha casa de praia ou apartamento para temporada?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Acesse a opção 'Anunciar imóvel' no menu superior, selecione a modalidade 'Aluguel Temporada' e cadastre fotos, comodidades, valor da diária e regras de hospedagem gratuitamente.",
        },
      },
    ],
  };

  const popularDestinations = [
    { name: "Fortaleza (CE)", slug: "fortaleza", desc: "Praia de Iracema, Meireles e Beira-Mar" },
    { name: "Trairi / Flecheiras (CE)", slug: "trairi", desc: "Paraíso dos esportes náuticos e praias paradisíacas" },
    { name: "Eusébio (CE)", slug: "eusebio", desc: "Casas espaçosas e tranquilidade a minutos da capital" },
    { name: "Vitória (ES)", slug: "vitoria", desc: "Capital capixaba com praias urbanas e alta gastronomia" },
    { name: "Conceição da Barra (ES)", slug: "conceicao-da-barra", desc: "Veraneio, sol e mar no litoral norte capixaba" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
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
          <span className="text-white font-medium">Aluguel por Temporada</span>
        </nav>

        {/* Hero Section */}
        <header className="mb-12 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Calendar size={14} /> Férias, Lazer e Viagens
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Aluguel por Temporada <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">no Brasil</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
              Encontre casas de praia, apartamentos de temporada e chalés aconchegantes. Reserve suas diárias diretamente com anfitriões e proprietários, sem taxas abusivas e com negociação transparente.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02]"
              >
                <Search size={16} /> Ver Mapa Interativo 3D
              </Link>
              <Link
                href="/anunciar"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all"
              >
                Anunciar meu Imóvel de Temporada
              </Link>
            </div>
          </div>
        </header>

        {/* Destinos Turísticos em Destaque */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <MapPin className="text-emerald-400" size={20} /> Destinos Populares de Temporada
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Explore cidades com alto fluxo turístico e excelente oferta de hospedagem.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularDestinations.map((dest) => (
              <Link
                key={dest.slug}
                href={`/imoveis/${dest.slug}?tipo=temporada`}
                className="group p-5 rounded-2xl border border-white/10 bg-slate-900/50 hover:bg-slate-900 hover:border-emerald-500/40 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {dest.name}
                  </h3>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {dest.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Grade de Imóveis de Temporada */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Imóveis Disponíveis para Reserva
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Mostrando {properties.length} opção(ões) verificadas de aluguel por temporada.
              </p>
            </div>
          </div>

          {properties.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
              <Calendar className="mx-auto text-emerald-400 mb-3" size={36} />
              <h3 className="text-lg font-bold text-white mb-2">Novos imóveis de temporada sendo adicionados</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                Seja o primeiro a cadastrar sua casa de praia ou apartamento de temporada e receba pedidos de reserva direto no WhatsApp ou portal.
              </p>
              <Link
                href="/anunciar"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all"
              >
                Cadastrar Imóvel Gratuitamente
              </Link>
            </div>
          ) : (
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
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md bg-emerald-500/90 text-white shadow-md">
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
                            <span className="flex items-center gap-1" title="Capacidade máxima">
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
                          Reservar <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Vantagens do RealStock para Temporada */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">
            Por que alugar por temporada no RealStock?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <MessageSquare size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Contato Direto com o Anfitrião</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tire dúvidas sobre regras, comodidades e localização falando diretamente com quem cuida do imóvel, sem intermediários.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CreditCard size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Sem Taxas Ocultas para Hóspedes</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Você visualiza o valor real da diária e da caução antecipadamente, sem taxas de serviço astronômicas aplicadas no check-out.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Sincronização com Portais Globais</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Calendários integrados com Google Vacation Rentals, Airbnb e Booking evitam overbooking e garantem a disponibilidade real.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Estruturado */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/30 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-emerald-400" /> Perguntas Frequentes sobre Aluguel de Temporada
          </h2>

          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Como alugar um imóvel de temporada no RealStock?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Acesse a página do imóvel desejado, selecione a data de check-in e check-out no calendário interativo e clique em &quot;Solicitar Reserva&quot;. O anfitrião responderá sua solicitação em tempo hábil.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Como funciona o pagamento e a confirmação?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Após a aprovação do anfitrião, você realiza o pagamento do sinal com a chave Pix do anfitrião informada com segurança. A reserva é confirmada instantaneamente.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Como anunciar meu imóvel para temporada?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Você pode cadastrar gratuitamente seu imóvel clicando em &quot;Anunciar imóvel&quot; no topo da página. Informe fotos de qualidade, capacidade de hóspedes, comodidades e comece a receber propostas.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
