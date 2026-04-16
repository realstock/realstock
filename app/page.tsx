"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Rocket } from "lucide-react";
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
  metaBoostedUntil?: string | null;
  instagramMediaId?: string | null;
  instagramPermalink?: string | null;
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
    "CASA", "CASA_EM_CONDOMINIO", "APARTAMENTO", "COBERTURA", "FLAT_STUDIO", "LOFT", "KITNET", "CHACARA", "SITIO", "FAZENDA",
  ],
  TERRENOS: [
    "TERRENO_URBANO", "TERRENO_EM_CONDOMINIO", "TERRENO_COMERCIAL", "TERRENO_INDUSTRIAL", "TERRENO_RURAL", "LOTE", "AREA_PARA_INCORPORACAO",
  ],
  COMERCIAL: [
    "SALA_COMERCIAL", "LOJA", "PONTO_COMERCIAL", "PREDIO_COMERCIAL", "HOTEL_POUSADA", "RESTAURANTE", "CLINICA",
  ],
  INDUSTRIAL_LOGISTICO: [
    "GALPAO_LOGISTICO", "GALPAO_INDUSTRIAL", "ARMAZEM", "AREA_INDUSTRIAL", "CENTRO_LOGISTICO",
  ],
} as const;


const BRAZIL_STATE_BOUNDS: Record<string, ClusterZoomTarget> = {
  "Acre": { "north": -7.1, "south": -11.1, "east": -66.5, "west": -73.9 },
  "Alagoas": { "north": -8.8, "south": -10.5, "east": -35.1, "west": -38.3 },
  "Amapá": { "north": 4.4, "south": -1.3, "east": -49.8, "west": -54.8 },
  "Amazonas": { "north": 2.3, "south": -9.8, "east": -56.1, "west": -73.8 },
  "Bahia": { "north": -8.5, "south": -18.3, "east": -37.3, "west": -46.6 },
  "Ceará": { "north": -2.7, "south": -7.8, "east": -37.2, "west": -41.4 },
  "Distrito Federal": { "north": -15.5, "south": -16, "east": -47.3, "west": -48.2 },
  "Espírito Santo": { "north": -17.8, "south": -21.3, "east": -39.6, "west": -41.8 },
  "Goiás": { "north": -12.4, "south": -19.5, "east": -45.9, "west": -53.2 },
  "Maranhão": { "north": -1, "south": -10.2, "east": -41.8, "west": -48.7 },
  "Mato Grosso": { "north": -7.2, "south": -17.9, "east": -50.2, "west": -61.5 },
  "Mato Grosso do Sul": { "north": -17.1, "south": -24, "east": -50.9, "west": -57.8 },
  "Minas Gerais": { "north": -14.2, "south": -22.9, "east": -39.8, "west": -51 },
  "Pará": { "north": 2.5, "south": -9.8, "east": -45.9, "west": -58.8 },
  "Paraíba": { "north": -6, "south": -8.3, "east": -34.7, "west": -38.7 },
  "Paraná": { "north": -22.5, "south": -26.7, "east": -48, "west": -54.6 },
  "Pernambuco": { "north": -7.2, "south": -9.4, "east": -34.8, "west": -41.3 },
  "Piauí": { "north": -2.7, "south": -10.9, "east": -40.3, "west": -45.9 },
  "Rio de Janeiro": { "north": -20.7, "south": -23.3, "east": -40.9, "west": -44.8 },
  "Rio Grande do Norte": { "north": -4.8, "south": -6.9, "east": -34.9, "west": -38.5 },
  "Rio Grande do Sul": { "north": -27, "south": -33.7, "east": -49.6, "west": -57.6 },
  "Rondônia": { "north": -7.9, "south": -13.7, "east": -59.7, "west": -66.8 },
  "Roraima": { "north": 5.2, "south": -1.5, "east": -58.8, "west": -64.8 },
  "Santa Catarina": { "north": -25.9, "south": -29.3, "east": -48.3, "west": -53.8 },
  "São Paulo": { "north": -19.7, "south": -25.3, "east": -44.1, "west": -53.1 },
  "Sergipe": { "north": -9.5, "south": -11.5, "east": -36.3, "west": -38.2 },
  "Tocantins": { "north": -5.1, "south": -13.4, "east": -45.7, "west": -50.7 }
};

function formatLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
    metaBoostedUntil: item.metaBoostedUntil || null,
    instagramMediaId: item.instagramMediaId || null,
    instagramPermalink: item.instagramPermalink || null,
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
  const [clusterZoomTarget, setClusterZoomTarget] = useState<ClusterZoomTarget | null>(null);
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
    if (!category) return availablePropertyTypes;
    const standardTypes: readonly string[] = PROPERTY_TYPES[category as keyof typeof PROPERTY_TYPES] || [];
    return availablePropertyTypes.filter(dbType => standardTypes.includes(dbType));
  }, [category, availablePropertyTypes]);

  async function loadInitialProperties() {
    try {
      setLoading(true);
      const res = await fetch("/api/properties");
      const data = await res.json();
      if (data.success) setProperties(normalizeProperties(data.properties));
    } catch (e) {} finally { setLoading(false); }
  }

  async function loadFilters(uf?: string, cidade?: string) {
    try {
      const url = new URL("/api/properties/filters", window.location.origin);
      if (uf) url.searchParams.set("state", uf);
      if (cidade) url.searchParams.set("city", cidade);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (data.success) {
        if (!uf) {
            setAvailableStates(data.states || []);
            setAvailableCountries(data.countries || []);
            setAvailablePropertyTypes(data.propertyTypes || []);
        }
        setAvailableCities(data.cities || []);
        setAvailableNeighborhoods(data.neighborhoods || []);
      }
    } catch (e) {}
  }

  useEffect(() => { loadFilters(stateName, city); }, [stateName, city]);

  async function geocodeAndFlyTo(query: string) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data?.[0]) {
        const bb = data[0].boundingbox;
        handleClusterZoomRequest({ north: parseFloat(bb[1]), south: parseFloat(bb[0]), west: parseFloat(bb[2]), east: parseFloat(bb[3]) });
      }
    } catch(e) {}
  }

  async function loadFilteredProperties(currentBounds: MapBounds) {
    try {
      setLoading(true);
      const res = await fetch("/api/properties/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          north: currentBounds.north, south: currentBounds.south, east: currentBounds.east, west: currentBounds.west,
          category, propertyType, priceMin, priceMax, country, state: stateName, city, neighborhood,
          bedroomsMin, bathroomsMin, frontSea, pool, acceptsFinancing,
        }),
      });
      const data = await res.json();
      if (data.success) setProperties(normalizeProperties(data.properties));
    } catch (e) {} finally { setLoading(false); }
  }

  useEffect(() => { loadInitialProperties(); }, []);

  useEffect(() => {
    if (!bounds || !boundsReady) return;
    const timer = setTimeout(() => { loadFilteredProperties(bounds); }, 500);
    return () => clearTimeout(timer);
  }, [bounds, boundsReady, category, propertyType, priceMin, priceMax, country, stateName, city, neighborhood, bedroomsMin, bathroomsMin, frontSea, pool, acceptsFinancing]);

  const handleBoundsChange = useCallback((nextBounds: MapBounds) => { setBounds(nextBounds); setBoundsReady(true); }, []);
  const handleClusterZoomRequest = useCallback((target: ClusterZoomTarget) => { setClusterZoomTarget(target); }, []);

  return (
    <main className="bg-slate-950 text-white min-h-screen">
      <section className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-[28px] border border-white/10 bg-white/5 p-6 h-fit sticky top-6">
            <Link 
                href="/anuncios-turbinados" 
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-pink-500/20 hover:scale-[1.02] transition-all mb-6 border border-white/20"
            >
                <Rocket size={14} /> Em Alta no Instagram
            </Link>

            <div className="space-y-5">
              <Field label="Categoria">
                <select value={category} onChange={(e) => { setCategory(e.target.value); setPropertyType(""); }} className="input text-sm">
                  <option value="">Todas</option>
                  <option value="RESIDENCIAL">Residencial</option>
                  <option value="TERRENOS">Terrenos</option>
                  <option value="COMERCIAL">Comercial</option>
                  <option value="INDUSTRIAL_LOGISTICO">Industrial / Logístico</option>
                </select>
              </Field>

              <Field label="Tipo">
                <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="input text-sm">
                  <option value="">Todos os tipos</option>
                  {typeOptions.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}
                </select>
              </Field>

              <Grid2>
                <Field label="Preço Mín.">
                  <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="input text-sm" placeholder="R$ 0" />
                </Field>
                <Field label="Preço Máx.">
                  <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="input text-sm" placeholder="R$ 9.9M" />
                </Field>
              </Grid2>

              <Field label="Estado (UF)">
                <select value={stateName} onChange={(e) => setStateName(e.target.value)} className="input text-sm">
                    <option value="">Todos Estados</option>
                    {availableStates.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <button 
                  onClick={() => bounds && loadFilteredProperties(bounds)} 
                  className="rounded-2xl bg-white text-slate-900 py-3 font-bold text-sm tracking-tight shadow-xl hover:bg-slate-100 transition-colors"
                >
                    Aplicar
                </button>
                <button 
                  onClick={clearFilters} 
                  className="rounded-2xl border border-white/10 bg-white/5 py-3 font-bold text-sm text-white hover:bg-white/10 transition-colors"
                >
                    Limpar
                </button>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <CesiumMapClient
              properties={properties}
              onBoundsChange={handleBoundsChange}
              clusterZoomTarget={clusterZoomTarget}
              onClusterZoomRequest={handleClusterZoomRequest}
            />

            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
              <div className="mb-8">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">Imóveis encontrados</div>
                  <h3 className="mt-1 text-3xl font-black">{properties.length} resultado(s)</h3>
              </div>

              {properties.length === 0 ? (
                <div className="py-20 text-center rounded-3xl border border-dashed border-white/10 bg-slate-900/40">
                  <p className="text-slate-500 italic">Nenhum imóvel nesta área do mapa.</p>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {properties.map((property) => {
                      const isPublishedIG = !!property.instagramMediaId;
                      const isSponsored = !!(property.sponsoredUntil && new Date(property.sponsoredUntil) > new Date());
                      const isMetaBoosted = !!(property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date());
                      const showIGColors = isPublishedIG || isMetaBoosted;

                      return (
                        <Link
                          key={property.id}
                          href={`/imovel/${property.id}`}
                          className={`group overflow-hidden rounded-[2rem] border transition-all duration-300 relative p-[2.5px] ${
                            showIGColors
                              ? "bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 shadow-[0_0_25px_rgba(236,72,153,0.25)] hover:shadow-[0_0_35px_rgba(236,72,153,0.4)] scale-[1.01]"
                              : isSponsored
                              ? "border-yellow-400 bg-yellow-400/10 shadow-[0_0_20px_rgba(250,204,21,0.15)] hover:shadow-[0_0_30px_rgba(250,204,21,0.3)]"
                              : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900"
                          }`}
                        >
                          <div className="h-full w-full rounded-[1.8rem] bg-slate-950 overflow-hidden flex flex-col">
                              <div className="relative aspect-[4/3] w-full bg-slate-800">
                                {property.mainImage ? (
                                  <img src={property.mainImage} alt={property.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-slate-600">Sem imagem</div>
                                )}
                                
                                {showIGColors && (
                                   <div className="absolute top-3 right-3 bg-gradient-to-tr from-purple-600 to-pink-500 text-white text-[8px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xl ring-1 ring-white/30 z-20 uppercase tracking-widest">
                                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg> 
                                      Instagram
                                   </div>
                                )}
                                
                                {isSponsored && !showIGColors && (
                                   <div className="absolute top-3 right-3 bg-yellow-400 text-slate-950 text-[9px] font-black px-3 py-1 rounded-full shadow-lg z-20 border border-white/20">PATROCINADO</div>
                                )}
                              </div>
                              
                              <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="text-2xl font-black text-white">{property.price}</div>
                                    <div className="mt-1 line-clamp-1 text-sm text-slate-300 font-medium">{property.title}</div>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                                  <span>{property.area} m²</span>
                                  <span className="h-1 w-1 rounded-full bg-slate-700" />
                                  <span>{property.city}</span>
                                </div>
                              </div>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
      {children}
    </div>
  );
}