import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

function normalizeSlug(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getPropertiesByCitySlug(citySlug: string) {
  const allProperties = await prisma.property.findMany({
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const matchingProperties = allProperties.filter((p) => {
    if (!p.city) return false;
    const slug = normalizeSlug(p.city);
    return slug === citySlug;
  });

  return matchingProperties;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city } = await params;
  const properties = await getPropertiesByCitySlug(city);

  if (properties.length === 0) {
    return {
      title: "Imóveis não encontrados | RealStock",
    };
  }

  const cityName = properties[0].city || city;
  const stateName = properties[0].state || "Brasil";
  const title = `Imóveis à Venda e Temporada em ${cityName} - ${stateName}`;
  const description = `Confira ${properties.length} imóveis disponíveis em ${cityName}, ${stateName}. Apartamentos, casas e aluguel por temporada direto com proprietários. Fotos, valores e negociação em tempo real!`;
  const canonicalUrl = `https://www.realstock.com.br/imoveis/${city}`;

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
      images: [
        {
          url: properties[0].images[0]?.imageUrl || "https://www.realstock.com.br/icon.png",
          width: 800,
          height: 600,
          alt: `Imóveis em ${cityName}`,
        },
      ],
    },
  };
}

export default async function CityLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { city } = await params;
  const { tipo } = await searchParams;
  const properties = await getPropertiesByCitySlug(city);

  if (properties.length === 0) {
    notFound();
  }

  const cityName = properties[0].city || city;
  const stateName = properties[0].state || "Brasil";
  const citySlug = city;

  // Filtragem opcional por tipo (venda vs temporada)
  const filteredProperties = properties.filter((p) => {
    if (!tipo || tipo === "todos") return true;
    if (tipo === "temporada") return p.listingType === "ALUGUEL_TEMPORADA";
    if (tipo === "venda") return p.listingType === "COMPRA_VENDA";
    return true;
  });

  const saleCount = properties.filter((p) => p.listingType === "COMPRA_VENDA").length;
  const seasonalCount = properties.filter((p) => p.listingType === "ALUGUEL_TEMPORADA").length;

  const siteUrl = "https://www.realstock.com.br";
  const canonicalUrl = `${siteUrl}/imoveis/${citySlug}`;

  // Schema ItemList para o Google exibir lista/carrossel
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `Imóveis em ${cityName} - ${stateName}`,
    "description": `Catálogo de imóveis à venda e temporada em ${cityName}, ${stateName}`,
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
        "name": "Imóveis",
        "item": siteUrl,
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": `Imóveis em ${cityName}`,
        "item": canonicalUrl,
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

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb Visual */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs md:text-sm text-slate-400">
          <Link href="/" className="hover:text-white transition-colors">
            Início
          </Link>
          <span>/</span>
          <Link href="/" className="hover:text-white transition-colors">
            Imóveis
          </Link>
          <span>/</span>
          <span className="text-white font-medium">{cityName} ({stateName})</span>
        </nav>

        {/* Hero Section */}
        <header className="mb-10 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <MapPin size={14} /> {cityName}, {stateName}
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
              Imóveis em <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">{cityName}</span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed mb-6">
              Confira apartamentos, casas e opções para alugar por temporada em {cityName}. Negocie direto, sem burocracia e com total segurança no RealStock.
            </p>

            {/* Badges de Contagem */}
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <span className="px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                Total: <strong className="text-white">{properties.length}</strong> imóveis
              </span>
              {saleCount > 0 && (
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  À Venda: <strong className="text-white">{saleCount}</strong>
                </span>
              )}
              {seasonalCount > 0 && (
                <span className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300">
                  Temporada: <strong className="text-white">{seasonalCount}</strong>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Filtros por Categoria */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <Link
            href={`/imoveis/${citySlug}`}
            className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
              !tipo || tipo === "todos"
                ? "bg-white text-slate-950 shadow-md"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            Todos ({properties.length})
          </Link>
          {saleCount > 0 && (
            <Link
              href={`/imoveis/${citySlug}?tipo=venda`}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                tipo === "venda"
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              À Venda ({saleCount})
            </Link>
          )}
          {seasonalCount > 0 && (
            <Link
              href={`/imoveis/${citySlug}?tipo=temporada`}
              className={`px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                tipo === "temporada"
                  ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                  : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              Temporada ({seasonalCount})
            </Link>
          )}
        </div>

        {/* Grid de Imóveis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {filteredProperties.map((property) => {
            const isSeasonal = property.listingType === "ALUGUEL_TEMPORADA";
            const imageUrl =
              property.images[0]?.imageUrl ||
              "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

            return (
              <Link
                key={property.id}
                href={`/imovel/${property.id}`}
                className="group flex flex-col rounded-3xl border border-white/10 bg-slate-900/60 overflow-hidden hover:border-emerald-500/40 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300"
              >
                {/* Imagem do Card */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-800">
                  <img
                    src={imageUrl}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md ${
                        isSeasonal
                          ? "bg-sky-500/80 text-white"
                          : "bg-emerald-500/80 text-white"
                      }`}
                    >
                      {isSeasonal ? "Temporada" : "À Venda"}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur-md text-emerald-400 font-bold text-sm">
                    R$ {Number(property.price).toLocaleString("pt-BR")}
                    {isSeasonal && <span className="text-xs text-slate-300 font-normal"> /diária</span>}
                  </div>
                </div>

                {/* Conteúdo do Card */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                      {property.title}
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                      <MapPin size={12} className="text-slate-500" />
                      {[property.neighborhood, property.city].filter(Boolean).join(", ")}
                    </p>
                  </div>

                  {/* Informações de Quartos / Banheiros / Metragem */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-4">
                      {property.bedrooms ? (
                        <span className="flex items-center gap-1.5" title="Quartos">
                          <Bed size={14} className="text-slate-400" />
                          {property.bedrooms} qts
                        </span>
                      ) : null}
                      {property.bathrooms ? (
                        <span className="flex items-center gap-1.5" title="Banheiros">
                          <Bath size={14} className="text-slate-400" />
                          {property.bathrooms} banh
                        </span>
                      ) : null}
                      {property.area ? (
                        <span className="flex items-center gap-1.5" title="Área">
                          <Maximize2 size={14} className="text-slate-400" />
                          {property.area}m²
                        </span>
                      ) : null}
                    </div>

                    <span className="flex items-center gap-1 text-emerald-400 font-semibold group-hover:translate-x-1 transition-transform">
                      Ver <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Seção de FAQ Local para SEO */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 md:p-10 mb-12">
          <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles size={20} className="text-emerald-400" /> Perguntas Frequentes sobre Imóveis em {cityName}
          </h2>

          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <h3 className="font-semibold text-white mb-2">
                Como comprar ou alugar imóveis em {cityName} pelo RealStock?
              </h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Basta selecionar o anúncio desejado e enviar uma proposta ou pré-reserva diretamente pela página do imóvel. A negociação é transparente, sem intermediários desnecessários e com proteção total de dados.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <h3 className="font-semibold text-white mb-2">
                Os valores dos imóveis em {cityName} são negociáveis?
              </h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Sim! No RealStock você tem um livro de ofertas em tempo real onde pode enviar contrapropostas para imóveis à venda ou consultar valores especiais para estadias de temporada.
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <h3 className="font-semibold text-white mb-2">
                Como anunciar meu imóvel em {cityName} no RealStock?
              </h3>
              <p className="text-slate-300 leading-relaxed text-xs md:text-sm">
                Você pode cadastrar seu imóvel gratuitamente acessando a opção &quot;Anunciar&quot; no menu principal. Seu anúncio é sincronizado com Google e redes sociais para maximizar seu alcance.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
