"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CesiumMapClient from "@/components/CesiumMapClient";

type PropertyPin = {
  id: number;
  title: string;
  price: string;
  legalStatus: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  mainImage: string | null;
  sponsoredUntil?: string | null;
};

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
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeProperties(items: any[]): PropertyPin[] {
  return (items || []).map((item: any) => ({
    id: Number(item.id),
    title: item.title,
    price: `R$ ${Number(item.price).toLocaleString("pt-BR")}`,
    legalStatus: item.legalStatus || "-",
    area: item.area || "-",
    city: item.city || "-",
    lat: Number(item.latitude),
    lng: Number(item.longitude),
    mainImage: item.images?.[0]?.imageUrl || null,
    sponsoredUntil: item.sponsoredUntil || null,
  }))
  .sort((a: any, b: any) => {
    const aSponsored = a.sponsoredUntil && new Date(a.sponsoredUntil) > new Date() ? 1 : 0;
    const bSponsored = b.sponsoredUntil && new Date(b.sponsoredUntil) > new Date() ? 1 : 0;
    return bSponsored - aSponsored;
  });
}

export default function HomePage() {
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
    // If no category is selected, we just show all existing types from the db.
    if (!category) return availablePropertyTypes;
    
    // If a category is selected, intersect standard types with DB types so we don't show empty categories
    const standardTypes: readonly string[] = PROPERTY_TYPES[category as keyof typeof PROPERTY_TYPES] || [];
    return availablePropertyTypes.filter(dbType => standardTypes.includes(dbType));
  }, [category, availablePropertyTypes]);

  async function loadInitialProperties() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/properties");
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
  }, []);

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
              <div className="text-sm text-slate-400">Busca geográfica</div>
              <h2 className="mt-1 text-2xl font-bold">Filtros</h2>
              <p className="mt-2 text-sm text-slate-400">
                Posicione o mapa na área desejada. Os imóveis exibidos serão os
                que estiverem na área visível e coincidirem com os filtros.
              </p>
            </div>

            <div className="space-y-4">
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

              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle label="Frente mar" checked={frontSea} onChange={setFrontSea} />
                <Toggle label="Piscina" checked={pool} onChange={setPool} />
                <Toggle
                  label="Aceita financiamento"
                  checked={acceptsFinancing}
                  onChange={setAcceptsFinancing}
                />
              </div>

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
            </div>
          </aside>

          <div className="space-y-4">
            {loading && properties.length === 0 && (
              <div className="flex justify-center rounded-2xl border border-white/10 bg-white/5 py-6 text-slate-400">
                Carregando imóveis...
              </div>
            )}

            <CesiumMapClient
              properties={properties}
              onBoundsChange={handleBoundsChange}
              clusterZoomTarget={clusterZoomTarget}
              onClusterZoomRequest={handleClusterZoomRequest}
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
                  {properties.map((property) => (
                    <Link
                      key={property.id}
                      href={`/imovel/${property.id}`}
                      className={`overflow-hidden rounded-2xl border transition relative ${
                        property.sponsoredUntil && new Date(property.sponsoredUntil) > new Date()
                          ? "border-yellow-400 bg-slate-900 shadow-[0_0_15px_rgba(250,204,21,0.2)] hover:shadow-[0_0_25px_rgba(250,204,21,0.4)]"
                          : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900"
                      }`}
                    >
                      {property.sponsoredUntil && new Date(property.sponsoredUntil) > new Date() && (
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-500 to-amber-500 text-yellow-950 font-black text-xs px-3 py-1 rounded-bl-xl shadow-lg z-10 animate-pulse border-b border-l border-yellow-300">
                          ⭐ PATROCINADO
                        </div>
                      )}
                      {property.mainImage ? (
                        <img
                          src={property.mainImage}
                          alt={property.title}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-slate-800 text-sm text-slate-500">
                          Sem foto
                        </div>
                      )}

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="line-clamp-2 text-lg font-semibold text-white">
                              {property.title}
                            </div>
                            <div className="mt-1 text-sm text-slate-400">
                              {property.city}
                            </div>
                          </div>

                          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                            {property.price}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 text-sm text-slate-300">
                          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                            <span className="text-slate-400">Situação</span>
                            <span>{property.legalStatus}</span>
                          </div>

                          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                            <span className="text-slate-400">Área</span>
                            <span>{property.area}</span>
                          </div>
                        </div>

                        <div className="mt-4 text-sm font-medium text-blue-300">
                          Ver imóvel →
                        </div>
                      </div>
                    </Link>
                  ))}
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