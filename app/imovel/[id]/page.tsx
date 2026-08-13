import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, CalendarCheck2 } from "lucide-react";
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

const AirbnbLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="currentColor">
    <path d="M16 1c-2.007 0-3.481 1.144-4.521 2.871L3.921 17.585C3.011 19.167 2 20.871 2 23.36 2 27.606 5.485 31 9.771 31c3.155 0 5.679-1.895 6.229-4.5.55 2.605 3.074 4.5 6.229 4.5C26.515 31 30 27.606 30 23.36c0-2.489-1.011-4.193-1.921-5.775L20.521 3.871C19.481 2.144 18.007 1 16 1zm0 3.333c.875 0 1.625.592 2.229 1.6l7.558 13.714c.712 1.237 1.212 2.376 1.212 3.713 0 2.505-1.954 4.333-4.229 4.333-2.128 0-3.692-1.583-4.183-3.667l-.78-3.333h-3.614l-.78 3.333C12.921 28.75 11.357 30.333 9.229 30.333 6.954 30.333 5 28.505 5 26c0-1.337.5-2.476 1.212-3.713L13.771 8.571C14.375 7.562 15.125 4.333 16 4.333zm0 7c-1.288 0-2.333 1.046-2.333 2.334 0 2.115 2.333 5.333 2.333 5.333s2.333-3.218 2.333-5.333c0-1.288-1.045-2.334-2.333-2.334zm0 2.667c.368 0 .667.299.667.667 0 .584-.667 1.776-.667 1.776s-.667-1.192-.667-1.776c0-.368.299-.667.667-.667z" />
  </svg>
);

const BookingLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.5 4h8.5c2.5 0 4.5 1.5 4.5 3.8 0 1.5-.9 2.7-2.2 3.3 1.7.5 2.8 2 2.8 3.8 0 2.5-2.1 4.1-4.8 4.1H2.5V4zm4.2 3.2v3.1h3.8c1.1 0 1.8-.6 1.8-1.5s-.7-1.6-1.8-1.6H6.7zm0 5.8v3.5h4.2c1.2 0 2.1-.7 2.1-1.7s-.9-1.8-2.1-1.8H6.7zM20 16.5a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z" />
  </svg>
);

const VrboLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 9.5V21h20V9.5L12 2zm0 3.2l7 5.3V19H5v-8.5l7-5.3zm-1 6.8h2v5h-2v-5z" />
  </svg>
);

const TripAdvisorLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-5 13.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zm10 0c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z" />
  </svg>
);

const ExpediaLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
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

  // Analisar portais iCal vinculados à propriedade
  const rawFeeds = (property.icalFeeds as { name?: string; url?: string }[]) || [];
  const detectedPortals: { id: string; name: string; type: string; badgeStyle: string }[] = [];
  const addedPortalIds = new Set<string>();

  for (const f of rawFeeds) {
    const urlStr = (f.url || "").toLowerCase();
    const nameStr = (f.name || "").toLowerCase();
    const combined = `${urlStr} ${nameStr}`;

    if (!urlStr && !nameStr) continue;

    if (combined.includes("airbnb") && !addedPortalIds.has("airbnb")) {
      addedPortalIds.add("airbnb");
      detectedPortals.push({
        id: "airbnb",
        name: "Airbnb",
        type: "airbnb",
        badgeStyle: "bg-[#FF5A5F]/15 text-[#FF5A5F] border-[#FF5A5F]/40 hover:bg-[#FF5A5F]/25",
      });
    } else if (combined.includes("booking") && !addedPortalIds.has("booking")) {
      addedPortalIds.add("booking");
      detectedPortals.push({
        id: "booking",
        name: "Booking.com",
        type: "booking",
        badgeStyle: "bg-[#003580]/25 text-[#3b82f6] border-[#003580]/50 hover:bg-[#003580]/40",
      });
    } else if ((combined.includes("vrbo") || combined.includes("homeaway") || combined.includes("aluguetemporada")) && !addedPortalIds.has("vrbo")) {
      addedPortalIds.add("vrbo");
      detectedPortals.push({
        id: "vrbo",
        name: "Vrbo / HomeAway",
        type: "vrbo",
        badgeStyle: "bg-[#194086]/25 text-[#60a5fa] border-[#194086]/50 hover:bg-[#194086]/40",
      });
    } else if ((combined.includes("tripadvisor") || combined.includes("flipkey")) && !addedPortalIds.has("tripadvisor")) {
      addedPortalIds.add("tripadvisor");
      detectedPortals.push({
        id: "tripadvisor",
        name: "TripAdvisor",
        type: "tripadvisor",
        badgeStyle: "bg-[#00AF87]/15 text-[#00AF87] border-[#00AF87]/40 hover:bg-[#00AF87]/25",
      });
    } else if ((combined.includes("expedia") || combined.includes("hotels.com")) && !addedPortalIds.has("expedia")) {
      addedPortalIds.add("expedia");
      detectedPortals.push({
        id: "expedia",
        name: "Expedia",
        type: "expedia",
        badgeStyle: "bg-[#FFCC00]/15 text-[#facc15] border-[#FFCC00]/40 hover:bg-[#FFCC00]/25",
      });
    } else {
      let customName = f.name?.trim() || "";
      if (!customName || customName.toLowerCase() === "outro") {
        try {
          if (f.url) {
            const u = new URL(f.url);
            customName = u.hostname.replace("www.", "");
          }
        } catch {
          customName = "Portal Parceiro";
        }
      }
      if (!customName) customName = "Portal Parceiro";
      const key = `custom-${customName}`;
      if (!addedPortalIds.has(key)) {
        addedPortalIds.add(key);
        detectedPortals.push({
          id: key,
          name: customName,
          type: "custom",
          badgeStyle: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25",
        });
      }
    }
  }

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

            {/* PORTAIS DE DISPONIBILIDADE ICAL */}
            {detectedPortals.length > 0 && (
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-bold">
                  Essa propriedade também está listada nos portais
                </h2>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  O calendário de disponibilidade desta acomodação é sincronizado em tempo real com as plataformas parceiras.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {detectedPortals.map((portal) => (
                    <div
                      key={portal.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4 transition-all hover:bg-white/5 hover:border-white/20"
                    >
                      {portal.type === "airbnb" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A5F] text-white shrink-0 shadow-lg shadow-[#FF5A5F]/20">
                          <AirbnbLogo className="w-5 h-5" />
                        </div>
                      ) : portal.type === "booking" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#003580] text-white shrink-0 shadow-lg shadow-[#003580]/20">
                          <BookingLogo className="w-5 h-5" />
                        </div>
                      ) : portal.type === "vrbo" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2f6ce5] text-white shrink-0 shadow-lg shadow-[#2f6ce5]/20">
                          <VrboLogo className="w-5 h-5" />
                        </div>
                      ) : portal.type === "tripadvisor" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00AF87] text-white shrink-0 shadow-lg shadow-[#00AF87]/20">
                          <TripAdvisorLogo className="w-5 h-5" />
                        </div>
                      ) : portal.type === "expedia" ? (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFCC00] text-slate-950 shrink-0 shadow-lg shadow-[#FFCC00]/20">
                          <ExpediaLogo className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shrink-0 shadow-lg">
                          <Globe size={18} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-white truncate block">
                          {portal.name}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold block mt-0.5">
                          ● Sincronizado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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