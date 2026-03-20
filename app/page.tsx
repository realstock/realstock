"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
};

type MapBounds = {
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
  }));
}

export default function HomePage() {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [properties, setProperties] = useState<PropertyPin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [category, setCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [country, setCountry] = useState("");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");
  const [bedroomsMin, setBedroomsMin] = useState("");
  const [bathroomsMin, setBathroomsMin] = useState("");
  const [frontSea, setFrontSea] = useState(false);
  const [pool, setPool] = useState(false);
  const [acceptsFinancing, setAcceptsFinancing] = useState(false);

  const typeOptions = useMemo(() => {
    if (!category) return [];
    return PROPERTY_TYPES[category as keyof typeof PROPERTY_TYPES] || [];
  }, [category]);

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
    if (!bounds) return;
    loadFilteredProperties(bounds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    bounds,
    category,
    propertyType,
    priceMin,
    priceMax,
    country,
    stateName,
    city,
    bedroomsMin,
    bathroomsMin,
    frontSea,
    pool,
    acceptsFinancing,
  ]);

  function clearFilters() {
    setCategory("");
    setPropertyType("");
    setPriceMin("");
    setPriceMax("");
    setCountry("");
    setStateName("");
    setCity("");
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
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
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
                  <option value="INDUSTRIAL_LOGISTICO">Industrial / Logístico</option>
                </select>
              </Field>

              <Field label="Tipo do imóvel">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="input"
                  disabled={!category}
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
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="input"
                  placeholder="Brasil"
                />
              </Field>

              <Grid2>
                <Field label="Estado">
                  <input
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="input"
                    placeholder="Ceará"
                  />
                </Field>

                <Field label="Cidade">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input"
                    placeholder="Trairi"
                  />
                </Field>
              </Grid2>

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
                  onClick={() => (bounds ? loadFilteredProperties(bounds) : loadInitialProperties())}
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
                {loading ? (
                  <span>Buscando imóveis...</span>
                ) : (
                  <span>{properties.length} imóvel(is) encontrado(s)</span>
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-4">
            <CesiumMapClient
              properties={properties}
              onBoundsChange={handleBoundsChange}
            />
          </div>
        </div>
      </section>
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