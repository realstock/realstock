import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  ArrowRight,
  TrendingUp,
  FileCheck2,
  Handshake,
  Sparkles,
  Search,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Imóveis à Venda no Brasil: Casas, Apartamentos e Terrenos | RealStock",
  description:
    "Encontre casas, apartamentos, coberturas e terrenos à venda no Brasil. Negocie direto com proprietários e corretores, envie propostas no livro de ofertas e feche negócio com segurança no RealStock.",
  alternates: {
    canonical: "https://www.realstock.com.br/imoveis-a-venda",
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
    title: "Imóveis à Venda no Brasil: Casas, Apartamentos e Terrenos | RealStock",
    description:
      "Catálogo de imóveis à venda direto com proprietários e corretores no RealStock. Livro de ofertas e negociação transparente.",
    url: "https://www.realstock.com.br/imoveis-a-venda",
    type: "website",
    locale: "pt_BR",
    siteName: "RealStock",
    images: [
      {
        url: "https://www.realstock.com.br/icon.png",
        width: 512,
        height: 512,
        alt: "Imóveis à Venda no Brasil - RealStock",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Imóveis à Venda no Brasil | RealStock",
    description: "Casas, apartamentos e terrenos com negociação em tempo real no RealStock.",
    images: ["https://www.realstock.com.br/icon.png"],
  },
};

async function getSaleProperties() {
  try {
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
      take: 60,
    });
    return properties;
  } catch (error) {
    console.error("Erro ao buscar imóveis à venda:", error);
    return [];
  }
}

export default async function ImoveisAVendaPage() {
  const properties = await getSaleProperties();
  const siteUrl = "https://www.realstock.com.br";
  const canonicalUrl = `${siteUrl}/imoveis-a-venda`;

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
        "name": "Imóveis à Venda",
        "item": canonicalUrl,
      },
    ],
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Imóveis à Venda no Brasil",
    "description": "Casas, apartamentos e terrenos disponíveis para compra",
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
        "name": "Como comprar um imóvel pelo RealStock?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Escolha o imóvel no catálogo, acesse a página de detalhes e envie sua oferta através do livro de ofertas em tempo real. O proprietário receberá uma notificação instantânea e responderá sua proposta.",
        },
      },
      {
        "@type": "Question",
        "name": "Posso negociar o valor do imóvel?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Sim! O RealStock possui um livro de ofertas aberto onde compradores podem enviar contrapropostas, acompanhar o histórico de lances e negociar diretamente.",
        },
      },
      {
        "@type": "Question",
        "name": "Os imóveis aceitam financiamento bancário?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Cada anúncio especifica se o imóvel aceita financiamento ou permuta na ficha técnica de detalhes jurídicos e comerciais.",
        },
      },
      {
        "@type": "Question",
        "name": "Como anunciar meu imóvel para venda?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Clique no botão 'Anunciar imóvel' no menu principal, preencha os dados do imóvel, envie fotos em alta resolução e publique seu anúncio gratuitamente.",
        },
      },
    ],
  };

  const popularCities = [
    { name: "Fortaleza (CE)", slug: "fortaleza", desc: "Apartamentos de luxo, vista mar e bairros nobres" },
    { name: "Eusébio (CE)", slug: "eusebio", desc: "Casas em condomínio fechado de alto padrão e lazer" },
    { name: "Vitória (ES)", slug: "vitoria", desc: "Capital com alto IDH, praias e excelente valorização" },
    { name: "Conceição da Barra (ES)", slug: "conceicao-da-barra", desc: "Casas de praia, terrenos e oportunidades de investimento" },
    { name: "Trairi (CE)", slug: "trairi", desc: "Lotes, casas de veraneio e expansão imobiliária litorânea" },
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
          <span className="text-white font-medium">Imóveis à Venda</span>
        </nav>

        {/* Hero Section */}
        <header className="mb-12 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Building2 size={14} /> Compra e Venda Direta
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Imóveis à Venda <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">no Brasil</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
              Encontre casas em condomínio, apartamentos, coberturas e terrenos com negociação em tempo real. Converse diretamente com proprietários e corretores, envie ofertas transparentes e compre seu imóvel com total segurança.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
              >
                <Search size={16} /> Explorar no Mapa 3D
              </Link>
              <Link
                href="/anunciar"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all"
              >
                Anunciar meu Imóvel à Venda
              </Link>
            </div>
          </div>
        </header>

        {/* Cidades em Destaque para Compra */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <MapPin className="text-blue-400" size={20} /> Cidades com Imóveis à Venda
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Explore cidades com forte liquidez e oportunidades no mercado imobiliário.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularCities.map((city) => (
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
                Oportunidades em Destaque
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Mostrando {properties.length} imóvel(is) cadastrados para compra e venda.
              </p>
            </div>
          </div>

          {properties.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
              <Building2 className="mx-auto text-blue-400 mb-3" size={36} />
              <h3 className="text-lg font-bold text-white mb-2">Novos imóveis à venda sendo cadastrados</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                Cadastre sua casa, apartamento ou terreno e alcance compradores de todo o país com marketing inteligente.
              </p>
              <Link
                href="/anunciar"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
              >
                Anunciar Imóvel Gratuitamente
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
                          Ver Detalhes <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Vantagens da Compra e Venda no RealStock */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-8 text-center">
            Vantagens de Comprar e Vender no RealStock
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Livro de Ofertas em Tempo Real</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Envie suas propostas com transparência e acompanhe as respostas do proprietário diretamente pelo painel da plataforma.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Handshake size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Sem Intermediação Burocrática</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Converse com quem decide e negocie condições de pagamento, financiamento e visitas sem travas comerciais.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <FileCheck2 size={20} />
              </div>
              <h3 className="font-bold text-white text-base">Anúncios Ricos com Mapa e Street View</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Visualize a vizinhança, o relevo topográfico em 3D e a localização exata do imóvel antes de agendar uma visita presencial.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Estruturado de Compra e Venda */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/30 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-blue-400" /> Dúvidas Comuns sobre Compra e Venda de Imóveis
          </h2>

          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Como enviar uma proposta para comprar um imóvel?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Acesse a página do imóvel desejado e use o &quot;Livro de Ofertas&quot; para enviar sua proposta com o valor que deseja ofertar. O proprietário ou corretor responsável receberá o aviso instantaneamente.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Como funciona a taxa de anúncio no RealStock?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                O cadastro e anúncio de imóveis são gratuitos. Você pode turbinar seu anúncio com campanhas de inteligência de tráfego pago nas redes sociais para acelerar a venda.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
              <h3 className="font-bold text-white mb-2">Posso financiar meu imóvel anunciado no portal?</h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Sim! Cada anúncio exibe claramente se aceita financiamento imobiliário pelos principais bancos (Caixa, Itaú, Bradesco, Santander).
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
