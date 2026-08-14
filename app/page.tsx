"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Rocket, Building2, Calendar, X, RefreshCw } from "lucide-react";
import CesiumMapClient from "@/components/CesiumMapClient";
import { useListingType } from "@/context/ListingTypeContext";


type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type ClusterZoomTarget = {
  north: number;
  south: number;
  east: number;
  west: number;
};

const SEASONAL_PROPERTY_TYPES = [
  "APARTAMENTOS_URBANOS_STUDIOS",
  "FLATS_APART_HOTEIS",
  "CASAS_DE_PRAIA",
  "CASAS_DE_CAMPO_CHACARAS",
  "CASAS_EM_CONDOMINIOS_FECHADOS",
  "ACONCHEGOS_RURAIS_ALTERNATIVOS",
] as const;

const PROPERTY_TYPES = {
  RESIDENCIAL: [
    "CASA",
    "CASA_EM_CONDOMINIO",
    "APARTAMENTO",
    "COBERTURA",
    "FLAT_STUDIO",
    "LOFT",
    "KITNET",
    "CHACARA",
    "SITIO",
    "FAZENDA",
  ],
  TERRENOS: [
    "TERRENO_URBANO",
    "TERRENO_EM_CONDOMINIO",
    "TERRENO_COMERCIAL",
    "TERRENO_INDUSTRIAL",
    "TERRENO_RURAL",
    "LOTE",
    "AREA_PARA_INCORPORACAO",
  ],
  COMERCIAL: [
    "SALA_COMERCIAL",
    "LOJA",
    "PONTO_COMERCIAL",
    "PREDIO_COMERCIAL",
    "HOTEL_POUSADA",
    "RESTAURANTE",
    "CLINICA",
  ],
  INDUSTRIAL_LOGISTICO: [
    "GALPAO_LOGISTICO",
    "GALPAO_INDUSTRIAL",
    "ARMAZEM",
    "AREA_INDUSTRIAL",
    "CENTRO_LOGISTICO",
  ],
} as const;


const BRAZIL_STATE_BOUNDS: Record<string, ClusterZoomTarget> = {
  "Acre": {
    "north": -7.1,
    "south": -11.1,
    "east": -66.5,
    "west": -73.9
  },
  "Alagoas": {
    "north": -8.8,
    "south": -10.5,
    "east": -35.1,
    "west": -38.3
  },
  "Amapá": {
    "north": 4.4,
    "south": -1.3,
    "east": -49.8,
    "west": -54.8
  },
  "Amazonas": {
    "north": 2.3,
    "south": -9.8,
    "east": -56.1,
    "west": -73.8
  },
  "Bahia": {
    "north": -8.5,
    "south": -18.3,
    "east": -37.3,
    "west": -46.6
  },
  "Ceará": {
    "north": -2.7,
    "south": -7.8,
    "east": -37.2,
    "west": -41.4
  },
  "Distrito Federal": {
    "north": -15.5,
    "south": -16,
    "east": -47.3,
    "west": -48.2
  },
  "Espírito Santo": {
    "north": -17.8,
    "south": -21.3,
    "east": -39.6,
    "west": -41.8
  },
  "Goiás": {
    "north": -12.4,
    "south": -19.5,
    "east": -45.9,
    "west": -53.2
  },
  "Maranhão": {
    "north": -1,
    "south": -10.2,
    "east": -41.8,
    "west": -48.7
  },
  "Mato Grosso": {
    "north": -7.2,
    "south": -17.9,
    "east": -50.2,
    "west": -61.5
  },
  "Mato Grosso do Sul": {
    "north": -17.1,
    "south": -24,
    "east": -50.9,
    "west": -57.8
  },
  "Minas Gerais": {
    "north": -14.2,
    "south": -22.9,
    "east": -39.8,
    "west": -51
  },
  "Pará": {
    "north": 2.5,
    "south": -9.8,
    "east": -45.9,
    "west": -58.8
  },
  "Paraíba": {
    "north": -6,
    "south": -8.3,
    "east": -34.7,
    "west": -38.7
  },
  "Paraná": {
    "north": -22.5,
    "south": -26.7,
    "east": -48,
    "west": -54.6
  },
  "Pernambuco": {
    "north": -7.2,
    "south": -9.4,
    "east": -34.8,
    "west": -41.3
  },
  "Piauí": {
    "north": -2.7,
    "south": -10.9,
    "east": -40.3,
    "west": -45.9
  },
  "Rio de Janeiro": {
    "north": -20.7,
    "south": -23.3,
    "east": -40.9,
    "west": -44.8
  },
  "Rio Grande do Norte": {
    "north": -4.8,
    "south": -6.9,
    "east": -34.9,
    "west": -38.5
  },
  "Rio Grande do Sul": {
    "north": -27,
    "south": -33.7,
    "east": -49.6,
    "west": -57.6
  },
  "Rondônia": {
    "north": -7.9,
    "south": -13.7,
    "east": -59.7,
    "west": -66.8
  },
  "Roraima": {
    "north": 5.2,
    "south": -1.5,
    "east": -58.8,
    "west": -64.8
  },
  "Santa Catarina": {
    "north": -25.9,
    "south": -29.3,
    "east": -48.3,
    "west": -53.8
  },
  "São Paulo": {
    "north": -19.7,
    "south": -25.3,
    "east": -44.1,
    "west": -53.1
  },
  "Sergipe": {
    "north": -9.5,
    "south": -11.5,
    "east": -36.3,
    "west": -38.2
  },
  "Tocantins": {
    "north": -5.1,
    "south": -13.4,
    "east": -45.7,
    "west": -50.7
  }
};

function formatLabel(value: string) {
  if (value === "APARTAMENTOS_URBANOS_STUDIOS") return "Apartamentos";
  if (value === "FLATS_APART_HOTEIS") return "Flats e apart-hotéis";
  if (value === "CASAS_DE_PRAIA") return "Casas de praia";
  if (value === "CASAS_DE_CAMPO_CHACARAS") return "Casas de campo e chácaras";
  if (value === "CASAS_EM_CONDOMINIOS_FECHADOS") return "Casas em condomínios fechados";
  if (value === "ACONCHEGOS_RURAIS_ALTERNATIVOS") return "Aconchegos rurais e alternativos";
  if (value === "TEMPORADA") return "Temporada";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

type PropertyPin = {
  id: number;
  title: string;
  price: string;
  rawPrice: number;
  legalStatus: string;
  area: string;
  city: string;
  neighborhood?: string | null;
  lat: number;
  lng: number;
  mainImage: string | null;
  sponsoredUntil?: string | null;
  metaBoostedUntil?: string | null;
  instagramMediaId?: string | null;
  instagramPermalink?: string | null;
  listingType?: string | null;
  minNights?: number | null;
  maxGuests?: number | null;
  depositPercentage?: number | null;
  pixKey?: string | null;
  customRates?: any;
};

type StayTotalResult = {
  numberOfNights: number;
  total: number;
  hasBlockedDate: boolean;
  isAvailable: boolean;
  unavailabilityReason?: string;
  formattedTotal: string;
};

function calculateStayTotal(
  property: PropertyPin,
  checkInStr: string,
  checkOutStr: string,
  guestsStr?: string
): StayTotalResult | null {
  if (!checkInStr || !checkOutStr) return null;

  const [inY, inM, inD] = checkInStr.split("T")[0].split("-").map(Number);
  const [outY, outM, outD] = checkOutStr.split("T")[0].split("-").map(Number);
  if (!inY || !inM || !inD || !outY || !outM || !outD) return null;

  const start = new Date(Date.UTC(inY, inM - 1, inD));
  const end = new Date(Date.UTC(outY, outM - 1, outD));

  const diffTime = end.getTime() - start.getTime();
  const numberOfNights = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (numberOfNights <= 0) return null;

  const guestsCountNum = Number(guestsStr || 1);
  if (property.maxGuests && guestsCountNum > property.maxGuests) {
    return {
      numberOfNights,
      total: 0,
      hasBlockedDate: false,
      isAvailable: false,
      unavailabilityReason: `Excede capacidade (${property.maxGuests} hóspedes)`,
      formattedTotal: "R$ 0",
    };
  }

  const basePrice = property.rawPrice || 0;
  const ratesMap = (property.customRates || {}) as Record<string, any>;

  let total = 0;
  let hasBlockedDate = false;
  let effectiveMinNights = property.minNights || 1;

  const cur = new Date(start);

  for (let i = 0; i < numberOfNights; i++) {
    const y = cur.getUTCFullYear();
    const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
    const d = String(cur.getUTCDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    const entry = ratesMap[dateStr];
    if (entry && typeof entry === "object" && entry.blocked === true) {
      hasBlockedDate = true;
    }

    if (i === 0 && entry && typeof entry === "object" && entry.minNights !== undefined) {
      effectiveMinNights = Number(entry.minNights);
    }

    let nightRate = basePrice;
    if (typeof entry === "number") {
      nightRate = entry;
    } else if (entry && typeof entry === "object" && entry.price !== undefined && entry.price !== null) {
      nightRate = Number(entry.price);
    }
    total += nightRate;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  if (numberOfNights < effectiveMinNights) {
    return {
      numberOfNights,
      total: 0,
      hasBlockedDate: false,
      isAvailable: false,
      unavailabilityReason: `Exige mínimo de ${effectiveMinNights} noites`,
      formattedTotal: "R$ 0",
    };
  }

  if (hasBlockedDate) {
    return {
      numberOfNights,
      total,
      hasBlockedDate: true,
      isAvailable: false,
      unavailabilityReason: "Datas fechadas pelo anfitrião",
      formattedTotal: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    };
  }

  return {
    numberOfNights,
    total,
    hasBlockedDate: false,
    isAvailable: true,
    formattedTotal: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  };
}

function normalizeProperties(items: any[]): PropertyPin[] {
  return (items || []).map((item: any) => ({
    id: Number(item.id),
    title: item.title,
    price: `R$ ${Number(item.price).toLocaleString("pt-BR")}`,
    rawPrice: Number(item.price || 0),
    legalStatus: item.legalStatus || "-",
    area: item.area || "-",
    city: item.city || "-",
    neighborhood: item.neighborhood || null,
    lat: Number(item.latitude),
    lng: Number(item.longitude),
    mainImage: item.images?.[0]?.imageUrl || null,
    sponsoredUntil: item.sponsoredUntil || null,
    metaBoostedUntil: item.metaBoostedUntil || null,
    instagramMediaId: item.instagramMediaId || null,
    instagramPermalink: item.instagramPermalink || null,
    listingType: item.listingType || "COMPRA_VENDA",
    minNights: item.minNights ? Number(item.minNights) : null,
    maxGuests: item.maxGuests ? Number(item.maxGuests) : null,
    depositPercentage: item.depositPercentage !== undefined && item.depositPercentage !== null ? Number(item.depositPercentage) : 20,
    pixKey: item.pixKey || null,
    customRates: item.customRates || {},
  }))
  .sort((a: any, b: any) => {
    const isNow = new Date();
    const aSpon = a.sponsoredUntil && new Date(a.sponsoredUntil) > isNow;
    const aIG = !!a.instagramMediaId;
    const bSpon = b.sponsoredUntil && new Date(b.sponsoredUntil) > isNow;
    const bIG = !!b.instagramMediaId;

    // Pontuação de Hierarquia
    const getScore = (spon: boolean, ig: boolean) => {
      if (spon && ig) return 3; // Nível 1: Patrocínio + IG
      if (spon) return 2;      // Nível 2: Só Patrocínio
      if (ig) return 1;        // Nível 3: Só IG
      return 0;                // Nível 4: Comum
    };

    return getScore(bSpon, bIG) - getScore(aSpon, aIG);
  });
}

const InstagramIcon = ({ size = 20 }: { size?: number }) => (
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

const FacebookIcon = ({ size = 20 }: { size?: number }) => (
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

const TwitterIcon = ({ size = 20 }: { size?: number }) => (
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

const YoutubeIcon = ({ size = 20 }: { size?: number }) => (
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

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const { listingType, checkInDate, setCheckInDate, checkOutDate, setCheckOutDate, guestsCount, setGuestsCount } = useListingType();
  const [viewMode, setViewMode] = useState<"both" | "map_only" | "cards_only">("both");
  const [reservationModalProperty, setReservationModalProperty] = useState<{
    property: PropertyPin;
    stayInfo: StayTotalResult;
  } | null>(null);
  const [submittingReservation, setSubmittingReservation] = useState(false);

  async function handleConfirmReservation() {
    if (!reservationModalProperty) return;
    try {
      setSubmittingReservation(true);
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: reservationModalProperty.property.id,
          offer_price: reservationModalProperty.stayInfo.total,
          total_stay_price: reservationModalProperty.stayInfo.total,
          start_date: checkInDate,
          end_date: checkOutDate,
          guests: Number(guestsCount || 1),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao enviar pedido de reserva.");
      }

      setReservationModalProperty(null);
      alert("🚀 Pedido de reserva enviado com sucesso! O anfitrião tem 24 horas para aceitar o pedido.");
      router.push("/minha-conta/ofertas");
    } catch (err: any) {
      alert(err?.message || "Erro ao solicitar reserva.");
    } finally {
      setSubmittingReservation(false);
    }
  }
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [properties, setProperties] = useState<PropertyPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [boundsReady, setBoundsReady] = useState(false);
  const [clusterZoomTarget, setClusterZoomTarget] =
    useState<ClusterZoomTarget | null>(null);
  const [availableStates, setAvailableStates] = useState<string[]>([]);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [availablePropertyTypes, setAvailablePropertyTypes] = useState<string[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  const [category, setCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [bedroomsMin, setBedroomsMin] = useState("");
  const [bathroomsMin, setBathroomsMin] = useState("");
  const [frontSea, setFrontSea] = useState(false);
  const [pool, setPool] = useState(false);
  const [acceptsFinancing, setAcceptsFinancing] = useState(false);

  const typeOptions = useMemo(() => {
    if (listingType === "ALUGUEL_TEMPORADA") {
      return SEASONAL_PROPERTY_TYPES as unknown as string[];
    }

    // If no category is selected, we just show all existing types from the db.
    if (!category) return availablePropertyTypes;
    
    // If a category is selected, intersect standard types with DB types so we don't show empty categories
    const standardTypes: readonly string[] = PROPERTY_TYPES[category as keyof typeof PROPERTY_TYPES] || [];
    return availablePropertyTypes.filter(dbType => standardTypes.includes(dbType));
  }, [category, availablePropertyTypes, listingType]);

  async function loadInitialProperties() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/properties?listingType=${listingType}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar imóveis.");
      }

      setProperties(normalizeProperties(data.properties || []));
    } catch (err: any) {
      console.error("INITIAL PROPERTIES ERROR:", err);
      setError(err.message || "Erro ao carregar imóveis.");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilters(uf?: string, cidade?: string) {
    try {
      const url = new URL("/api/properties/filters", window.location.origin);
      if (uf) url.searchParams.set("state", uf);
      if (cidade) url.searchParams.set("city", cidade);

      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        if (!uf && data.states) setAvailableStates(data.states);
        if (!uf && data.countries) setAvailableCountries(data.countries);
        if (!uf && data.propertyTypes) setAvailablePropertyTypes(data.propertyTypes);
        if (data.cities) setAvailableCities(data.cities);
        if (data.neighborhoods) setAvailableNeighborhoods(data.neighborhoods);
      }
    } catch (e) {
      console.error("Falha ao buscar filtros:", e);
    }
  }

  async function loadPartners() {
    try {
      const res = await fetch("/api/partners");
      const data = await res.json();
      if (data.success) setPartners(data.partners || []);
    } catch (e) {}
  }

  useEffect(() => {
    loadFilters(stateName, city);
  }, [stateName, city]);

  async function geocodeAndFlyTo(query: string) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { boundingbox } = data[0];
        if (boundingbox) {
           const [south, north, west, east] = boundingbox;
           handleClusterZoomRequest({
             north: parseFloat(north),
             south: parseFloat(south),
             east: parseFloat(east),
             west: parseFloat(west)
           });
        }
      }
    } catch(e) {
      console.error("FlyTo geocoding failed", e);
    }
  }

  async function loadFilteredProperties(currentBounds: MapBounds) {
    try {
      setLoading(true);
      setError("");

      const payload = {
        north: currentBounds.north,
        south: currentBounds.south,
        east: currentBounds.east,
        west: currentBounds.west,
        category,
        propertyType,
        priceMin,
        priceMax,
        country,
        state: stateName,
        city,
        neighborhood,
        bedroomsMin,
        bathroomsMin,
        frontSea,
        pool,
        acceptsFinancing,
        listingType,
        checkInDate: listingType === "ALUGUEL_TEMPORADA" ? checkInDate : undefined,
        checkOutDate: listingType === "ALUGUEL_TEMPORADA" ? checkOutDate : undefined,
        guestsCount: listingType === "ALUGUEL_TEMPORADA" ? guestsCount : undefined,
      };

      const res = await fetch("/api/properties/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao buscar imóveis.");
      }

      setProperties(normalizeProperties(data.properties || []));
    } catch (err: any) {
      console.error("FILTERED PROPERTIES ERROR:", err);
      setError(err.message || "Erro ao buscar imóveis.");
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialProperties();
    loadPartners();
  }, [listingType]);

  useEffect(() => {
    if (!bounds || !boundsReady) return;

    const timer = setTimeout(() => {
      loadFilteredProperties(bounds);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bounds,
    boundsReady,
    category,
    propertyType,
    priceMin,
    priceMax,
    country,
    stateName,
    city,
    neighborhood,
    bedroomsMin,
    bathroomsMin,
    frontSea,
    pool,
    acceptsFinancing,
    listingType,
    checkInDate,
    checkOutDate,
    guestsCount,
  ]);

  async function handleApplyFilters() {
    if (neighborhood && city && stateName) {
      try {
        setLoading(true);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(neighborhood + ", " + city + ", " + stateName + ", Brasil")}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          const bb = data[0].boundingbox;
          handleClusterZoomRequest({ north: parseFloat(bb[1]), south: parseFloat(bb[0]), west: parseFloat(bb[2]), east: parseFloat(bb[3]) });
          return;
        }
      } catch(e) {}
    } else if (city && stateName) {
      try {
        setLoading(true);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city + ", " + stateName + ", Brasil")}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) {
          const bb = data[0].boundingbox;
          handleClusterZoomRequest({ north: parseFloat(bb[1]), south: parseFloat(bb[0]), west: parseFloat(bb[2]), east: parseFloat(bb[3]) });
          return;
        }
      } catch(e) {}
    } else if (stateName && BRAZIL_STATE_BOUNDS[stateName]) {
      handleClusterZoomRequest(BRAZIL_STATE_BOUNDS[stateName]);
      return;
    }
    
    if (bounds) loadFilteredProperties(bounds);
    else loadInitialProperties();
  }

  function clearFilters() {
    setCategory("");
    setPropertyType("");
    setPriceMin("");
    setPriceMax("");
    setCountry("");
    setStateName("");
    setCity("");
    setNeighborhood("");
    setBedroomsMin("");
    setBathroomsMin("");
    setFrontSea(false);
    setPool(false);
    setAcceptsFinancing(false);

    if (bounds) {
      loadFilteredProperties(bounds);
    } else {
      loadInitialProperties();
    }
  }

  const handleBoundsChange = useCallback((nextBounds: MapBounds) => {
    setBounds((prev) => {
      if (
        prev &&
        prev.north === nextBounds.north &&
        prev.south === nextBounds.south &&
        prev.east === nextBounds.east &&
        prev.west === nextBounds.west
      ) {
        return prev;
      }
      return nextBounds;
    });

    setBoundsReady(true);
  }, []);

  const handleClusterZoomRequest = useCallback((target: ClusterZoomTarget) => {
    setClusterZoomTarget(target);
  }, []);

  return (
    <main className="bg-slate-950 text-white">
      <section className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="mb-5">
              <Link 
                href="/anuncios-turbinados" 
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all mb-6 border border-white/20"
              >
                <Rocket size={14} /> Em Alta
              </Link>
              
              <div className="text-sm text-slate-400">Busca geográfica</div>
              <h2 className="mt-1 text-2xl font-bold">Filtros</h2>
              <p className="mt-2 text-sm text-slate-400">
                Posicione o mapa na área desejada. Os imóveis exibidos serão os
                que estiverem na área visível e coincidirem com os filtros.
              </p>
            </div>

            <div className="space-y-4">
              {listingType === "ALUGUEL_TEMPORADA" && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      📅 Datas & Hóspedes
                    </h3>
                    {(checkInDate || checkOutDate || guestsCount !== "1") && (
                      <button
                        onClick={() => {
                          setCheckInDate("");
                          setCheckOutDate("");
                          setGuestsCount("1");
                        }}
                        className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Check-in</label>
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition cursor-pointer [color-scheme:dark]"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Check-out</label>
                      <input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition cursor-pointer [color-scheme:dark]"
                        min={checkInDate || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Qtd. de Hóspedes</label>
                    <input
                      type="number"
                      min="1"
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none transition"
                      placeholder="Ex.: 2"
                    />
                  </div>
                </div>
              )}

              {listingType !== "ALUGUEL_TEMPORADA" && (
                <Field label="Categoria">
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPropertyType("");
                    }}
                    className="input"
                  >
                    <option value="">Todas</option>
                    <option value="RESIDENCIAL">Residencial</option>
                    <option value="TERRENOS">Terrenos</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="INDUSTRIAL_LOGISTICO">
                      Industrial / Logístico
                    </option>
                  </select>
                </Field>
              )}

              <Field label="Tipo do imóvel">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="input"
                >
                  <option value="">Todos</option>
                  {typeOptions.map((item) => (
                    <option key={item} value={item}>
                      {formatLabel(item)}
                    </option>
                  ))}
                </select>
              </Field>

              <Grid2>
                <Field label="Preço mín.">
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="input"
                    placeholder="0"
                  />
                </Field>

                <Field label="Preço máx.">
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="input"
                    placeholder="9999999"
                  />
                </Field>
              </Grid2>

              <Field label="País">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="input"
                >
                  <option value="">Todos</option>
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Grid2>
                <Field label="Estado">
                  <select
                    value={stateName}
                    onChange={(e) => {
                      const st = e.target.value;
                      setStateName(st);
                      if (st && BRAZIL_STATE_BOUNDS[st]) {
                        handleClusterZoomRequest(BRAZIL_STATE_BOUNDS[st]);
                      }
                    }}
                    className="input"
                  >
                    <option value="">Todos</option>
                    {availableStates.map(st => (
                       <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Cidade">
                  <select
                    value={city}
                    onChange={(e) => {
                      const newCity = e.target.value;
                      setCity(newCity);
                      setNeighborhood("");
                      if (newCity) {
                        geocodeAndFlyTo(`${newCity}, ${stateName || ""}, Brazil`);
                      } else if (stateName && BRAZIL_STATE_BOUNDS[stateName]) {
                        handleClusterZoomRequest(BRAZIL_STATE_BOUNDS[stateName]);
                      }
                    }}
                    className="input"
                    disabled={availableCities.length === 0}
                  >
                    <option value="">Todas</option>
                    {availableCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </Grid2>

                <Field label="Bairro">
                  <select
                    value={neighborhood}
                    onChange={(e) => {
                      const newNeigh = e.target.value;
                      setNeighborhood(newNeigh);
                      if (newNeigh) {
                        geocodeAndFlyTo(`${newNeigh}, ${city || ""}, ${stateName || ""}, Brazil`);
                      } else if (city) {
                        geocodeAndFlyTo(`${city}, ${stateName || ""}, Brazil`);
                      }
                    }}
                    className="input"
                    disabled={availableNeighborhoods.length === 0}
                  >
                    <option value="">Todos</option>
                    {availableNeighborhoods.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </Field>

              <Grid2>
                <Field label="Quartos mín.">
                  <input
                    type="number"
                    value={bedroomsMin}
                    onChange={(e) => setBedroomsMin(e.target.value)}
                    className="input"
                    placeholder="0"
                  />
                </Field>

                <Field label="Banheiros mín.">
                  <input
                    type="number"
                    value={bathroomsMin}
                    onChange={(e) => setBathroomsMin(e.target.value)}
                    className="input"
                    placeholder="0"
                  />
                </Field>
              </Grid2>

              {/* Filtros de características removidos */}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900"
                >
                  Aplicar
                </button>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                >
                  Limpar
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
                {loading && properties.length === 0 ? (
                  <span>Carregando imóveis...</span>
                ) : (
                  <span>{properties.length} imóvel(is) encontrado(s)</span>
                )}
              </div>

              {/* Siga a RealStock nas Redes Sociais */}
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Siga a RealStock nas redes
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  <a
                    href="https://www.instagram.com/realstock.com.br"
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center justify-center rounded-xl bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-pink-500/10"
                    title="Instagram"
                  >
                    <InstagramIcon size={18} />
                  </a>
                  <a
                    href="https://www.facebook.com/profile.php?id=61576499943300"
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/10"
                    title="Facebook"
                  >
                    <FacebookIcon size={18} />
                  </a>
                  <a
                    href="https://youtube.com/@realstock_live?si=PcZmxTavYsNIIhtQ"
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center justify-center rounded-xl bg-red-600 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/10"
                    title="YouTube"
                  >
                    <YoutubeIcon size={18} />
                  </a>
                  <a
                    href="https://x.com/_RealStock_"
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-11 items-center justify-center rounded-xl bg-slate-950 border border-white/15 text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/20"
                    title="X (Twitter)"
                  >
                    <TwitterIcon size={16} />
                  </a>
                </div>
              </div>
            </div>

            {/* IMOBILIÁRIAS PARCEIRAS */}
            {partners.length > 0 && (
              <div className="mt-10 border-t border-white/10 pt-8">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sky-400">
                  <Building2 size={14} />
                  Imobiliárias Parceiras
                </div>
                
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {partners.map(p => (
                    <Link 
                      key={p.id} 
                      href={`/imobiliaria/${p.id}`}
                      className="group relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 transition-all hover:border-sky-500/50 hover:bg-sky-500/5"
                    >
                      <img 
                        src={p.companyLogo} 
                        alt={p.name} 
                        className="h-full w-full object-contain transition-transform group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100">
                         <span className="text-[10px] font-bold text-white">Ver Imóveis</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="space-y-4">
            {loading && properties.length === 0 && (
              <div className="flex justify-center rounded-2xl border border-white/10 bg-white/5 py-6 text-slate-400">
                Carregando imóveis...
              </div>
            )}

            <CesiumMapClient
              properties={useMemo(() => {
                if (listingType === "ALUGUEL_TEMPORADA" && checkInDate && checkOutDate) {
                  return properties.filter((p) => {
                    const info = calculateStayTotal(p, checkInDate, checkOutDate, guestsCount);
                    return !info || info.isAvailable;
                  });
                }
                return properties;
              }, [properties, listingType, checkInDate, checkOutDate, guestsCount])}
              onBoundsChange={handleBoundsChange}
              clusterZoomTarget={clusterZoomTarget}
              onClusterZoomRequest={handleClusterZoomRequest}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              guestsCount={guestsCount}
            />

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-400">
                    Imóveis na área visível do mapa
                  </div>
                  <h3 className="mt-1 text-2xl font-bold">
                    {properties.length} resultado(s)
                  </h3>
                </div>

                {loading && (
                  <div className="text-sm text-slate-400">
                    Atualizando lista...
                  </div>
                )}
              </div>

              {properties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                  Nenhum imóvel encontrado na área atual do mapa com os filtros aplicados.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {properties.map((property) => {
                      const isNow = new Date();
                      const isPublishedIG = !!property.instagramMediaId;
                      const isSponsored = !!(property.sponsoredUntil && new Date(property.sponsoredUntil) > isNow);
                      const isMetaBoosted = !!(property.metaBoostedUntil && new Date(property.metaBoostedUntil) > isNow);
                      
                      const hasIG = isPublishedIG || isMetaBoosted;

                      const stayInfo = property.listingType === "ALUGUEL_TEMPORADA" && checkInDate && checkOutDate
                        ? calculateStayTotal(property, checkInDate, checkOutDate, guestsCount)
                        : null;

                      const isUnavailable = stayInfo ? !stayInfo.isAvailable : false;

                      return (
                        <div
                          key={property.id}
                          className={`group overflow-hidden rounded-[2rem] border transition-all duration-300 relative p-[2.5px] ${
                            isUnavailable
                              ? "border-red-500/30 bg-slate-900/40 opacity-75 hover:opacity-100 hover:border-red-500/50"
                              : isSponsored && hasIG
                              ? "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_30px_rgba(250,204,21,0.5)] scale-[1.02]"
                              : isSponsored
                              ? "border-yellow-400 bg-yellow-400/20 shadow-[0_0_15px_rgba(250,204,21,0.2)] hover:shadow-[0_0_25px_rgba(250,204,21,0.4)]"
                              : hasIG
                              ? "bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 shadow-[0_0_20px_rgba(236,72,153,0.2)] hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]"
                              : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900"
                          }`}
                        >
                          <Link 
                            href={`/imovel/${property.id}${
                              property.listingType === "ALUGUEL_TEMPORADA" && (checkInDate || checkOutDate || (guestsCount && guestsCount !== "1"))
                                ? `?checkin=${encodeURIComponent(checkInDate || "")}&checkout=${encodeURIComponent(checkOutDate || "")}&guests=${encodeURIComponent(guestsCount || "1")}`
                                : ""
                            }`}
                            className={`h-full w-full rounded-[1.8rem] overflow-hidden flex flex-col pt-0 ${
                              hasIG ? "bg-indigo-950" : "bg-slate-950"
                            }`}
                          >
                                <div className="relative h-48 w-full bg-slate-800 overflow-hidden">
                                    {property.mainImage ? (
                                        <img
                                            src={property.mainImage}
                                            alt={property.title}
                                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-slate-800 text-sm text-slate-500">
                                            Sem foto
                                        </div>
                                    )}

                                    {isUnavailable && (
                                      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] z-30 flex items-center justify-center p-2 text-center">
                                        <span className="bg-red-600/90 text-white font-black text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-xl border border-red-400/30">
                                          🚫 Indisponível para as datas
                                        </span>
                                      </div>
                                    )}

                                    {/* Badges Hierárquicas */}
                                    {!isUnavailable && isSponsored && hasIG && (
                                        <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-500 to-pink-500 text-white text-[8px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xl ring-1 ring-white/20 z-20 uppercase tracking-tighter">
                                            <Rocket size={10} fill="white" /> VIP GOLD + IG
                                        </div>
                                    )}

                                    {!isUnavailable && isSponsored && !hasIG && (
                                        <div className="absolute top-2 right-2 bg-yellow-400 text-slate-950 text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg z-20 border border-white/20 uppercase">
                                            Patrocinado
                                        </div>
                                    )}

                                    {!isUnavailable && !isSponsored && hasIG && (
                                        <div className="absolute top-2 right-2 bg-gradient-to-tr from-purple-600 to-pink-500 text-white text-[8px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg ring-1 ring-white/20 z-20 uppercase">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> 
                                            Instagram
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 flex-1">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="line-clamp-1 text-base font-bold text-white leading-tight">
                                                {property.title}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500 font-medium">
                                                {property.city}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-sm font-black text-emerald-400 shadow-sm shadow-emerald-400/5">
                                            {property.price}
                                        </div>
                                    </div>

                                    {stayInfo && (
                                      <div className={`mt-3 rounded-xl border p-2.5 ${
                                        isUnavailable
                                          ? "border-red-500/30 bg-red-500/10"
                                          : "border-emerald-500/30 bg-emerald-500/10"
                                      }`}>
                                        {isUnavailable ? (
                                          <div>
                                            <div className="text-xs font-black text-red-400 flex items-center gap-1">
                                              <span>🚫 Indisponível</span>
                                            </div>
                                            <p className="mt-0.5 text-[10px] text-red-300 font-medium">
                                              {stayInfo.unavailabilityReason || "Período fechado pelo anfitrião"}
                                            </p>
                                          </div>
                                        ) : (
                                          <div>
                                            <div className="flex items-center justify-between text-xs font-extrabold text-emerald-300">
                                              <span>Total Estadia ({stayInfo.numberOfNights} {stayInfo.numberOfNights === 1 ? 'noite' : 'noites'}):</span>
                                              <span className="text-sm font-black text-emerald-400">{stayInfo.formattedTotal}</span>
                                            </div>
                                            <p className="mt-0.5 text-[10px] text-slate-400 font-medium">
                                              Média: {(stayInfo.total / stayInfo.numberOfNights).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} / noite
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="mt-4 grid gap-2 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                                        {property.listingType === "ALUGUEL_TEMPORADA" ? (
                                          <>
                                            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                                                <span className="opacity-50">Cidade / Bairro</span>
                                                <span className="text-slate-200 font-extrabold">
                                                  {property.city}{property.neighborhood ? ` · ${property.neighborhood}` : ""}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between rounded-xl bg-sky-500/5 border border-sky-500/10 px-3 py-2">
                                                <span className="text-sky-400">Máx. Hóspedes</span>
                                                <span className="text-sky-300 font-black">
                                                  {property.maxGuests ? `${property.maxGuests} ${property.maxGuests === 1 ? 'hóspede' : 'hóspedes'}` : "Não informado"}
                                                </span>
                                            </div>

                                            {property.minNights && (
                                              <div className="flex items-center justify-between rounded-xl bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
                                                  <span className="text-emerald-400">Mínimo Estadia</span>
                                                  <span className="text-emerald-300 font-black">{property.minNights} {property.minNights === 1 ? 'noite' : 'noites'}</span>
                                              </div>
                                            )}

                                            <div className="mt-3">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  if (!checkInDate || !checkOutDate) {
                                                    alert("Por favor, selecione as datas de check-in e check-out no topo para reservar este imóvel.");
                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                    return;
                                                  }
                                                  if (!stayInfo || !stayInfo.isAvailable) {
                                                    alert(stayInfo?.unavailabilityReason || "Imóvel indisponível no período selecionado.");
                                                    return;
                                                  }
                                                  setReservationModalProperty({ property, stayInfo });
                                                }}
                                                disabled={stayInfo ? !stayInfo.isAvailable : false}
                                                className={`w-full rounded-xl py-2.5 px-4 text-xs font-black transition flex items-center justify-center gap-2 shadow-lg ${
                                                  stayInfo && !stayInfo.isAvailable
                                                    ? "bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed"
                                                    : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer"
                                                }`}
                                              >
                                                <Calendar className="h-4 w-4" />
                                                {stayInfo && !stayInfo.isAvailable ? "Indisponível nestas datas" : "Reservar"}
                                              </button>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                                                <span className="opacity-50">Situação</span>
                                                <span className="text-slate-200">{property.legalStatus}</span>
                                            </div>

                                            <div className="flex items-center justify-between rounded-xl bg-white/5 border border-white/5 px-3 py-2">
                                                <span className="opacity-50">Área</span>
                                                <span className="text-slate-200">{property.area} m²</span>
                                            </div>
                                          </>
                                        )}
                                    </div>
                                </div>
                          </Link>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <footer className="fixed bottom-0 left-0 w-full border-t border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-3 text-xs text-slate-400 sm:flex-row">
        <div>
          © 2026 RealStock. Todos os direitos reservados. Plataforma de anúncios imobiliários.
        </div>

        <a
          href="mailto:contato@realstock.com.br"
          className="text-slate-300 transition hover:text-white"
        >
          Contato
        </a>
      </div>
    </footer>

    <div className="pb-16" />

    {reservationModalProperty && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">Confirmar Pedido de Reserva</h3>
                <p className="text-xs text-slate-400 max-w-[280px] truncate">{reservationModalProperty.property.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReservationModalProperty(null)}
              className="rounded-xl bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-sm text-slate-300">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Período:</span>
              <span className="font-bold text-white">
                {checkInDate} a {checkOutDate} ({reservationModalProperty.stayInfo.numberOfNights} {reservationModalProperty.stayInfo.numberOfNights === 1 ? 'noite' : 'noites'})
              </span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Hóspedes:</span>
              <span className="font-bold text-white">{guestsCount} {Number(guestsCount) === 1 ? 'hóspede' : 'hóspedes'}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Valor Total da Estadia:</span>
              <span className="font-bold text-emerald-400 text-base">{reservationModalProperty.stayInfo.formattedTotal}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-400">Sinal para Confirmação ({reservationModalProperty.property.depositPercentage || 20}%):</span>
              <span className="font-black text-emerald-300 text-base">
                {((reservationModalProperty.stayInfo.total * (reservationModalProperty.property.depositPercentage || 20)) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200 leading-relaxed space-y-1">
            <p className="font-bold text-amber-300 flex items-center gap-1">
              <span>⚠️</span> Aviso de Confirmação:
            </p>
            <p>
              O anfitrião irá cobrar <strong>{reservationModalProperty.property.depositPercentage || 20}%</strong> ({((reservationModalProperty.stayInfo.total * (reservationModalProperty.property.depositPercentage || 20)) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}) do valor total da reserva para confirmar.
            </p>
            <p className="pt-1 text-slate-300">
              Ao confirmar, as datas ficarão <strong>indisponíveis por 24 horas</strong> ou até a aceitação/recusa do anfitrião com o status <em>"Pedido de reserva enviado"</em>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => setReservationModalProperty(null)}
              disabled={submittingReservation}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white transition text-center cursor-pointer"
            >
              Não, cancelar pedido de reserva
            </button>
            <button
              type="button"
              onClick={handleConfirmReservation}
              disabled={submittingReservation}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-black transition text-center shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                submittingReservation
                  ? "bg-transparent border border-emerald-500/40 text-emerald-400 opacity-60 backdrop-blur-sm pointer-events-none"
                  : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/20"
              }`}
            >
              {submittingReservation ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Aguarde...</span>
                </>
              ) : (
                "Sim, confirmar pedido de reserva"
              )}
            </button>
          </div>
        </div>
      </div>
    )}
  </main>
    






  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
        checked
          ? "border-white bg-white text-slate-900"
          : "border-white/10 bg-slate-900/70 text-white"
      }`}
    >
      {label}
    </button>
    
  );
  
}