import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import OfferBookClient from "@/components/OfferBookClient";
import PropertyShareButtons from "@/components/PropertyShareButtons";

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

  const mainImage = property.images[0]?.imageUrl || null;
  const galleryImages = property.images.slice(1);

  const offers = property.offers.map((offer) => ({
    id: offer.id,
    buyer_name: offer.buyer.name,
    offer_price: offer.offerPrice.toString(),
    status: offer.status,
    created_at: offer.createdAt.toISOString(),
  }));

  const propertyUrl = `${
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
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
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
            anúncio imobiliário
          </div>

          <h1 className="mt-3 text-4xl font-bold">{property.title}</h1>
          <p className="mt-2 text-lg text-slate-400">
            {addressLine || property.city}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_420px]">
          <div className="space-y-5">
            {mainImage ? (
              <div className="overflow-hidden rounded-[28px] border border-white/10">
                <img
                  src={mainImage}
                  alt={property.title}
                  className="h-[440px] w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-[440px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 text-slate-500">
                Nenhuma foto enviada para este imóvel.
              </div>
            )}

            {galleryImages.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {galleryImages.map((image) => (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-2xl border border-white/10"
                  >
                    <img
                      src={image.imageUrl}
                      alt={property.title}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

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

            <PropertyShareButtons title={property.title} url={propertyUrl} />

            <div className="mt-5">
              <OfferBookClient
                propertyId={property.id}
                ownerId={property.ownerId}
                askingPrice={property.price.toString()}
                offers={offers}
              />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}