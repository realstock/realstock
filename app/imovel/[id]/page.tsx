import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OfferBookClient from "@/components/OfferBookClient";
import AdSenseBanner from "@/components/AdSenseBanner";
import { fetchICalEvents } from "@/lib/ical-parser";
import PropertyGallery from "@/components/PropertyGallery";
import PropertyLocationInsights from "@/components/PropertyLocationInsights";
import PropertyStreetView from "@/components/PropertyStreetView";
const InstagramIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className="fill-current"
  >
    <path d="M7.75 2C4.678 2 2 4.678 2 7.75v8.5C2 19.322 4.678 22 7.75 22h8.5C19.322 22 22 19.322 22 16.25v-8.5C22 4.678 19.322 2 16.25 2h-8.5zm0 2h8.5C18.217 4 20 5.783 20 7.75v8.5c0 1.967-1.783 3.75-3.75 3.75h-8.5C5.783 20 4 18.217 4 16.25v-8.5C4 5.783 5.783 4 7.75 4zm9.75 1.5a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
  </svg>
);

const FacebookIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className="fill-current"
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TwitterIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className="fill-current"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const YoutubeIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className="fill-current"
  >
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const propertyId = Number(id);

  if (!propertyId || Number.isNaN(propertyId)) {
    return {
      title: "Imóvel não encontrado | RealStock",
    };
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  if (!property) {
    return {
      title: "Imóvel não encontrado | RealStock",
    };
  }

  const title = `${property.title} | RealStock`;
  const description = property.description?.substring(0, 160) || "Confira este imóvel incrível na RealStock.";
  const imageUrl = property.images?.[0]?.imageUrl || "https://www.realstock.com.br/icon.png";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: property.title,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkin?: string; checkout?: string; guests?: string }>;
}) {
  const { id } = await params;
  const { checkin, checkout, guests } = await searchParams;
  const propertyId = Number(id);

  if (!propertyId || Number.isNaN(propertyId)) {
    notFound();
  }

  const property = await prisma.property.findUnique({
    where: {
      id: propertyId,
    },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      videos: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      offers: {
        orderBy: {
          offerPrice: "desc",
        },
        include: {
          buyer: true,
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  // Carregar e fundir eventos dos feeds iCal vinculados
  const icalEvents: any[] = [];
  const feeds = (property.icalFeeds as { name: string; url: string }[]) || [];
  if (property.listingType === "ALUGUEL_TEMPORADA" && feeds.length > 0) {
    try {
      const fetchPromises = feeds.map((feed) =>
        fetchICalEvents(feed.url, feed.name)
      );
      const results = await Promise.all(fetchPromises);
      for (const eventsList of results) {
        icalEvents.push(...eventsList);
      }
    } catch (err) {
      console.error("Erro ao sincronizar feeds iCal no servidor:", err);
    }
  }

  const parsedICalOffers = icalEvents.map((evt, index) => ({
    id: -1000 - index,
    buyerId: -1,
    offerPrice: new Prisma.Decimal(0),
    status: "accepted",
    startDate: evt.start,
    endDate: evt.end,
    createdAt: new Date(),
    buyer: {
      id: -1,
      name: evt.summary,
      email: "",
      phone: "",
      instagram: "",
    },
  }));

  const combinedOffers = [
    ...property.offers,
    ...parsedICalOffers as any[],
  ];

  // Fetch social sessions
  const [igSessions, fbSessions, xTransactions, ytSessions] = await Promise.all([
    prisma.instagramPreviewSession.findMany({
      where: { listingId: propertyId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.facebookFeedSession.findMany({
      where: { listingId: propertyId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financialTransaction.findMany({
      where: {
        category: "POSTS",
        description: {
          contains: `Publicação de Imóvel #${propertyId} (X/Twitter)`,
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.youtubeShortsSession.findMany({
      where: { listingId: propertyId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    })
  ]);

  const xReelsTx = xTransactions.find(tx => tx.description ? tx.description.includes("[Format: reels]") && tx.description.includes("[Permalink:") : false);
  const xCarouselTx = xTransactions.find(tx => tx.description ? !tx.description.includes("[Format: reels]") && tx.description.includes("[Permalink:") : false);

  const xReelsMatch = xReelsTx?.description ? xReelsTx.description.match(/\[Permalink:\s*(https?:\/\/[^\]]+)\]/) : null;
  const xReelsPermalink = xReelsMatch ? xReelsMatch[1] : null;

  const xCarouselMatch = xCarouselTx?.description ? xCarouselTx.description.match(/\[Permalink:\s*(https?:\/\/[^\]]+)\]/) : null;
  const xCarouselPermalink = xCarouselMatch ? xCarouselMatch[1] : null;

  const socialLinks = [
    {
      name: "Instagram",
      links: [
        { type: "Reels", permalink: (igSessions.find(s => s.postType === "reels" && (s.validationReport as any)?.permalink)?.validationReport as any)?.permalink },
        { type: "Carrossel", permalink: (igSessions.find(s => s.postType !== "reels" && (s.validationReport as any)?.permalink)?.validationReport as any)?.permalink },
      ].filter(l => l.permalink)
    },
    {
      name: "Facebook",
      links: [
        { type: "Reels", permalink: (fbSessions.find(s => s.postType === "reels" && (s.validationReport as any)?.permalink)?.validationReport as any)?.permalink },
        { type: "Carrossel", permalink: (fbSessions.find(s => s.postType !== "reels" && (s.validationReport as any)?.permalink)?.validationReport as any)?.permalink },
      ].filter(l => {
          if (!l.permalink) return false;
          // Prepend domain for relative FB reels links
          if (l.permalink.startsWith('/')) {
              l.permalink = `https://www.facebook.com${l.permalink}`;
          }
          return true;
      })
    },
    {
      name: "Twitter (X)",
      links: [
        { type: "Reels", permalink: xReelsPermalink },
        { type: "Carrossel", permalink: xCarouselPermalink },
      ].filter(l => l.permalink)
    },
    {
      name: "YouTube",
      links: ytSessions.map(s => ({
        type: "Shorts",
        permalink: s.permalink || `https://youtube.com/shorts/${s.videoId}`
      })).filter(l => l.permalink)
    }
  ];

  const offers = combinedOffers.map((offer) => ({
    id: offer.id,
    buyer_name: offer.buyer?.name || "Comprador",
    offer_price: offer.offerPrice.toString(),
    status: offer.status,
    created_at: offer.createdAt.toISOString(),
    startDate: offer.startDate ? offer.startDate.toISOString() : null,
    endDate: offer.endDate ? offer.endDate.toISOString() : null,
    guests: (offer as any).guests || null,
  }));

  const propertyUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.realstock.com.br"
  }/imovel/${property.id}`;

  function formatYesNo(value: boolean | null | undefined) {
    return value ? "Sim" : "Não";
  }

  function formatText(value: unknown) {
    if (value === null || value === undefined || value === "") return "-";
    return String(value);
  }

  const addressLine = [
    property.street,
    property.addressNumber,
    property.neighborhood,
    property.city,
    property.state,
    property.country,
    property.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  const topographyPoints = property.topographyPoints
    ? property.topographyPoints
        .split(",")
        .map((point) => point.trim())
        .filter(Boolean)
    : [];

  const isSeasonal = property.listingType === "ALUGUEL_TEMPORADA";

  const compactDetails = isSeasonal
    ? [
        ["Categoria", formatText(property.category)],
        ["Tipo", formatText(property.propertyType)],
        ["Mínimo de noites", property.minNights ? `${property.minNights} noites` : "1 noite"],
        ["Máximo de hóspedes", property.maxGuests ? `${property.maxGuests} pessoas` : "-"],
        ["Caução / Sinal", property.depositPercentage ? `${property.depositPercentage}%` : "20%"],
        ["Área total", formatText(property.area)],
        ["Área construída", formatText(property.areaBuilt)],
        ["Quartos", formatText(property.bedrooms)],
        ["Suítes", formatText(property.suites)],
        ["Banheiros", formatText(property.bathrooms)],
        ["Vagas", formatText(property.parkingSpaces)],
        ["Mobiliado", formatYesNo(property.furnished)],
        ["Condomínio", formatYesNo(property.condominium)],
        [
          "Valor condomínio",
          property.condominiumFee
            ? `R$ ${property.condominiumFee.toString()}`
            : "-",
        ],
        ["Frente mar", formatYesNo(property.frontSea)],
        ["Piscina", formatYesNo(property.pool)],
        ["Código", `#${property.id}`],
      ]
    : [
        ["Categoria", formatText(property.category)],
        ["Tipo", formatText(property.propertyType)],
        ["Jurídico", formatText(property.legalStatus)],
        ["Área total", formatText(property.area)],
        ["Área construída", formatText(property.areaBuilt)],
        ["Quartos", formatText(property.bedrooms)],
        ["Suítes", formatText(property.suites)],
        ["Banheiros", formatText(property.bathrooms)],
        ["Vagas", formatText(property.parkingSpaces)],
        ["Mobiliado", formatYesNo(property.furnished)],
        ["Condomínio", formatYesNo(property.condominium)],
        [
          "Valor condomínio",
          property.condominiumFee
            ? `R$ ${property.condominiumFee.toString()}`
            : "-",
        ],
        ["Financiamento", formatYesNo(property.acceptsFinancing)],
        ["Frente mar", formatYesNo(property.frontSea)],
        ["Piscina", formatYesNo(property.pool)],
        ["Código", `#${property.id}`],
      ];

  return (
    <main className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {property.sold && (
        <div className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 py-4 text-center shadow-lg relative overflow-hidden flex items-center justify-center gap-3">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
          <div className="relative z-10 flex items-center gap-2 text-white font-black uppercase tracking-[0.15em] text-sm md:text-base animate-pulse">
            <span className="text-xl">🏡</span>
            Este Imóvel foi Vendido com Sucesso!
            <span className="text-xl">🎉</span>
          </div>
        </div>
      )}
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <Link 
            href="/minha-conta/anuncios" 
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar para Meus anúncios
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
              {isSeasonal ? "aluguel por temporada" : "anúncio imobiliário"}
            </div>
            <div className="bg-white/10 px-3 py-1 rounded-full text-[11px] font-bold text-slate-400 border border-white/10">
              IMÓVEL #{property.id}
            </div>
          </div>

          <h1 className="mt-3 text-4xl font-bold">{property.title}</h1>
          <p className="mt-2 text-lg text-slate-400">
            {addressLine || property.city}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_420px]">
          <div className="space-y-5 min-w-0">
            <PropertyGallery 
              images={property.images} 
              videos={property.videos} 
              alt={property.title} 
            />

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-bold">Descrição e detalhes</h2>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-200">
                {property.description || "Sem descrição cadastrada."}
              </p>

              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
                  {compactDetails
                    .filter(([_, value]) => value !== "Não" && value !== "-")
                    .map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-3 border-b border-white/5 py-1.5 text-sm"
                    >
                      <span className="text-slate-400">{label}</span>
                      <span className="text-right font-medium text-white">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-bold">Endereço completo</h2>

              <div className="mt-3 text-sm font-medium text-white">
                {addressLine || "Endereço não informado."}
              </div>
            </div>

            {/* Redes Sociais */}
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
              <h2 className="text-xl font-bold">Confira esse anúncio nas redes sociais</h2>
              
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {socialLinks.map((platform) => (
                  <div key={platform.name} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        {platform.name === 'Instagram' ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white">
                            <InstagramIcon size={18} />
                          </div>
                        ) : platform.name === 'Facebook' ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <FacebookIcon size={18} />
                          </div>
                        ) : platform.name === 'YouTube' ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white">
                            <YoutubeIcon size={18} />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-white/15 text-white">
                            <TwitterIcon size={14} />
                          </div>
                        )}
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {platform.name}
                        </span>
                      </div>
                      
                      {platform.links.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {platform.links.map((link) => (
                            <a
                              key={`${platform.name}-${link.type}`}
                              href={link.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10 hover:scale-[1.02]"
                            >
                              <span className="opacity-70">{link.type}</span>
                              <div className="h-1 w-1 rounded-full bg-white/30" />
                              <span className="text-xs text-blue-400">Ver post</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic leading-relaxed">
                          Esse anúncio ainda não tem postagem no {platform.name === 'Twitter (X)' ? 'X' : platform.name}.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {property.googleMapsThumbnail || property.googleMapsLink ? (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-bold">Localização no mapa</h2>

                {property.googleMapsThumbnail && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                    <iframe
                      src={property.googleMapsThumbnail}
                      className="h-[280px] w-full"
                      loading="lazy"
                    />
                  </div>
                )}

                {property.googleMapsLink && (
                  <div className="mt-4">
                    <a
                      href={property.googleMapsLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                    >
                      Abrir no Google Maps
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            <PropertyStreetView latitude={property.latitude?.toString() ?? null} longitude={property.longitude?.toString() ?? null} />

            <PropertyLocationInsights latitude={property.latitude?.toString() ?? null} longitude={property.longitude?.toString() ?? null} />

            {property.youtubeThumbnail || property.youtubeLink ? (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-bold">Vídeo do imóvel</h2>

                {property.youtubeThumbnail && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                    <img
                      src={property.youtubeThumbnail}
                      alt="Miniatura do vídeo"
                      className="h-[280px] w-full object-cover"
                    />
                  </div>
                )}

                {property.youtubeLink && (
                  <div className="mt-4">
                    <a
                      href={property.youtubeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300 hover:bg-red-400/15"
                    >
                      Assistir no YouTube
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            {property.category === "TERRENOS" && topographyPoints.length > 0 && (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-bold">
                  Pontos da planta topográfica
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {topographyPoints.map((point, index) => (
                    <div
                      key={`${point}-${index}`}
                      className="rounded-2xl border border-white/10 bg-slate-900/70 p-3"
                    >
                      <div className="text-xs text-slate-400">
                        Ponto {index + 1}
                      </div>
                      <div className="mt-1 text-sm font-medium">{point}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-[24px] border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-slate-400">
              {property.listingType === "ALUGUEL_TEMPORADA" ? "Valor da diária" : "Valor de venda"}
            </div>

            <div className="mt-2 text-4xl font-bold text-emerald-400">
              R$ {property.price.toString()} {property.listingType === "ALUGUEL_TEMPORADA" ? "/ diária" : ""}
            </div>

            {!isSeasonal && (
              <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm leading-6 text-blue-200">
                Os dados do anunciante ficam protegidos e só serão liberados após aceite de proposta pelo vendedor ou quando uma oferta atingir o valor de venda do imóvel.
              </div>
            )}

            {property.sold ? (
              <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 text-center shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3 border border-emerald-500/20 animate-bounce">
                  🎉
                </div>
                <h3 className="text-base font-bold text-emerald-400">Imóvel Vendido!</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  O proprietário já concluiu com sucesso a venda deste imóvel através da nossa plataforma. O anúncio não aceita mais novas ofertas.
                </p>
              </div>
            ) : (
              <div className="mt-5">
                <OfferBookClient
                  propertyId={property.id}
                  ownerId={property.ownerId}
                  askingPrice={property.price.toString()}
                  offers={offers}
                  listingType={property.listingType}
                  minNights={property.minNights}
                  customRates={property.customRates as any}
                  defaultCheckIn={checkin}
                  defaultCheckOut={checkout}
                  defaultGuests={guests}
                />
              </div>
            )}

          </aside>
        </div>
      </section>
    </main>
  );
}