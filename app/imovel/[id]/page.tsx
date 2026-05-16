import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OfferBookClient from "@/components/OfferBookClient";
import AdSenseBanner from "@/components/AdSenseBanner";
import PropertyGallery from "@/components/PropertyGallery";

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

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Fetch social sessions
  const [igSessions, fbSessions] = await Promise.all([
    prisma.instagramPreviewSession.findMany({
      where: { listingId: propertyId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.facebookFeedSession.findMany({
      where: { listingId: propertyId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const socialLinks = [
    {
      name: "Instagram",
      links: [
        { type: "Reels", permalink: (igSessions.find(s => s.postType === "reels")?.validationReport as any)?.permalink },
        { type: "Carrossel", permalink: (igSessions.find(s => s.postType !== "reels")?.validationReport as any)?.permalink },
      ].filter(l => l.permalink)
    },
    {
      name: "Facebook",
      links: [
        { type: "Reels", permalink: (fbSessions.find(s => s.postType === "reels")?.validationReport as any)?.permalink },
        { type: "Carrossel", permalink: (fbSessions.find(s => s.postType !== "reels")?.validationReport as any)?.permalink },
      ].filter(l => {
          if (!l.permalink) return false;
          // Prepend domain for relative FB reels links
          if (l.permalink.startsWith('/')) {
              l.permalink = `https://www.facebook.com${l.permalink}`;
          }
          return true;
      })
    }
  ].filter(p => p.links.length > 0);

  const offers = property.offers.map((offer) => ({
    id: offer.id,
    buyer_name: offer.buyer.name,
    offer_price: offer.offerPrice.toString(),
    status: offer.status,
    created_at: offer.createdAt.toISOString(),
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

  const compactDetails = [
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
              anúncio imobiliário
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
                  {compactDetails.map(([label, value]) => (
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
              
              {socialLinks.length > 0 ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {socialLinks.map((platform) => (
                    <div key={platform.name} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                      <div className="flex items-center gap-3">
                        {platform.name === 'Instagram' ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white">
                            <InstagramIcon size={18} />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <FacebookIcon size={18} />
                          </div>
                        )}
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {platform.name}
                        </span>
                      </div>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-slate-500">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  <p className="text-sm text-slate-400 max-w-[280px]">
                    O anunciante ainda não publicou este anúncio nas redes sociais.
                  </p>
                </div>
              )}
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
            <div className="text-sm text-slate-400">Valor de venda</div>

            <div className="mt-2 text-4xl font-bold text-emerald-400">
              R$ {property.price.toString()}
            </div>

            <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm leading-6 text-blue-200">
              Os dados do anunciante ficam protegidos e só serão liberados após
              aceite de proposta pelo vendedor ou quando uma oferta atingir o valor
              de venda do imóvel.
            </div>

            <div className="mt-5">
              <OfferBookClient
                propertyId={property.id}
                ownerId={property.ownerId}
                askingPrice={property.price.toString()}
                offers={offers}
              />
            </div>

            {/* Banner Lateral Google Ads */}
            <div className="mt-8 flex justify-center border border-white/5 bg-slate-900/50 rounded-2xl py-6 relative overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center -z-10 text-slate-800 text-[10px] uppercase font-black tracking-widest">Publicidade</div>
               <AdSenseBanner 
                 slot="7835437222"
                 format="" 
                 responsive="false" 
                 style={{ display: "inline-block", width: "300px", height: "600px" }} 
               />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}