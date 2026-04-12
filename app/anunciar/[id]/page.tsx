"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PropertyLocationPicker from "@/components/PropertyLocationPicker";
import NeighborhoodAutocomplete from "@/components/NeighborhoodAutocomplete";

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

const BRAZILIAN_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];


function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function EditarAnuncioPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [category, setCategory] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [legalStatus, setLegalStatus] = useState("Regular");
  const [areaTotal, setAreaTotal] = useState("");
  const [areaBuilt, setAreaBuilt] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [parkingSpaces, setParkingSpaces] = useState("");
  const [suites, setSuites] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [condominium, setCondominium] = useState(false);
  const [condominiumFee, setCondominiumFee] = useState("");
  const [acceptsFinancing, setAcceptsFinancing] = useState(false);
  const [frontSea, setFrontSea] = useState(false);
  const [pool, setPool] = useState(false);

  const [country, setCountry] = useState("Brasil");
  const [stateName, setStateName] = useState("");
  const [city, setCity] = useState("");

  const [citiesList, setCitiesList] = useState<{nome: string}[]>([]);

  useEffect(() => {
    if (!stateName) {
      setCitiesList([]);
      return;
    }
    const stateObj = BRAZILIAN_STATES.find((s) => s.name === stateName);
    if (stateObj) {
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateObj.uf}/municipios`)
        .then(res => res.json())
        .then(data => {
           const list = data.map((d: any) => ({ nome: d.nome })).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
           setCitiesList(list);
        })
        .catch(console.error);
    } else {
      setCitiesList([]);
    }
  }, [stateName]);

  useEffect(() => {
    async function geocodeLocation() {
      if (!stateName) return;

      const query = city ? `${city}, ${stateName}, Brasil` : `${stateName}, Brasil`;

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}`
        );
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setFlyToCoords({ latitude: lat, longitude: lon });
        }
      } catch (err) {
        console.error("Erro ao buscar coordenadas geográficas:", err);
      }
    }

    const timeoutId = setTimeout(() => {
      geocodeLocation();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [stateName, city]);

  const [neighborhood, setNeighborhood] = useState("");
  const [flyToCoords, setFlyToCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [googleMapsThumbnail, setGoogleMapsThumbnail] = useState("");

  const [youtubeLink, setYoutubeLink] = useState("");
  const [youtubeThumbnail, setYoutubeThumbnail] = useState("");

  const [topographyPoints, setTopographyPoints] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);

  const typeOptions = useMemo(() => {
    if (!category) return [];
    return PROPERTY_TYPES[category as keyof typeof PROPERTY_TYPES] || [];
  }, [category]);

  function buildGoogleMapsLinkFromCoords(
    lat: number | null,
    lng: number | null
  ) {
    if (lat === null || lng === null) return "";
    if (Number.isNaN(lat) || Number.isNaN(lng)) return "";
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  function buildGoogleMapsThumbnail(
  lat: number | null,
  lng: number | null
) {
  if (lat === null || lng === null) return "";

  return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
}

  function extractYoutubeId(url: string) {
    if (!url) return "";
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&]+)/,
      /(?:youtu\.be\/)([^?&]+)/,
      /(?:youtube\.com\/embed\/)([^?&]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return "";
  }

  function buildYoutubeThumbnail(url: string) {
    const videoId = extractYoutubeId(url);
    if (!videoId) return "";
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }

  function updateTopographyPoint(index: number, value: string) {
    setTopographyPoints((prev) =>
      prev.map((item, i) => (i === index ? value : item))
    );
  }

  function addTopographyPoint() {
    setTopographyPoints((prev) => [...prev, ""]);
  }

  function removeTopographyPoint(index: number) {
    if (topographyPoints.length <= 4) return;
    setTopographyPoints((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const converted = await Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

    setNewImages((prev) => [...prev, ...converted]);
  }

  function removeExistingImage(imageId: number) {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  function removeNewImage(index: number) {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }

  useEffect(() => {
    async function loadProperty() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/anunciar/${id}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Não foi possível carregar o anúncio.");
        }

        const p = data.property;

        setCategory(p.category || "");
        setPropertyType(p.propertyType || "");
        setTitle(p.title || "");
        setDescription(p.description || "");
        setPrice(p.price?.toString() || "");
        setLegalStatus(p.legalStatus || "Regular");
        setAreaTotal(p.area || "");
        setAreaBuilt(p.areaBuilt || "");
        setBedrooms(p.bedrooms?.toString() || "");
        setBathrooms(p.bathrooms?.toString() || "");
        setParkingSpaces(p.parkingSpaces?.toString() || "");
        setSuites(p.suites?.toString() || "");
        setFurnished(Boolean(p.furnished));
        setCondominium(Boolean(p.condominium));
        setCondominiumFee(p.condominiumFee?.toString() || "");
        setAcceptsFinancing(Boolean(p.acceptsFinancing));
        setFrontSea(Boolean(p.frontSea));
        setPool(Boolean(p.pool));

        setCountry(p.country || "Brasil");
        setStateName(p.state || "");
        setCity(p.city || "");
        setNeighborhood(p.neighborhood || "");
        setStreet(p.street || "");
        setAddressNumber(p.addressNumber || "");
        setZipCode(p.zipCode || "");
        setGoogleMapsLink(p.googleMapsLink || "");
        setGoogleMapsThumbnail(p.googleMapsThumbnail || "");

        setYoutubeLink(p.youtubeLink || "");
        setYoutubeThumbnail(p.youtubeThumbnail || "");

        setLatitude(p.latitude ? Number(p.latitude) : null);
        setLongitude(p.longitude ? Number(p.longitude) : null);

        setExistingImages(p.images || []);

        if (p.topographyPoints) {
          const points = p.topographyPoints
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean);

          setTopographyPoints(points.length >= 4 ? points : [...points, "", "", "", ""].slice(0, 4));
        }
      } catch (err: any) {
        setError(err.message || "Erro ao carregar anúncio.");
      } finally {
        setLoading(false);
      }
    }

    if (id) loadProperty();
  }, [id]);

  useEffect(() => {
    setGoogleMapsLink(buildGoogleMapsLinkFromCoords(latitude, longitude));
    setGoogleMapsThumbnail(buildGoogleMapsThumbnail(latitude, longitude));
  }, [latitude, longitude]);

  useEffect(() => {
    setYoutubeThumbnail(buildYoutubeThumbnail(youtubeLink));
  }, [youtubeLink]);

  async function handleDelete() {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este anúncio? Esta ação não pode ser desfeita.")) return;

    try {
      setSaving(true);
      setError("");
      
      const res = await fetch(`/api/anunciar/${id}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Erro desconhecido");

      router.push("/minha-conta/anuncios");
    } catch(err: any) {
      setError("Erro ao tentar excluir: " + err.message);
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!category || !propertyType) {
      setError("Categoria e tipo do imóvel são obrigatórios.");
      return;
    }

    if (
      !title ||
      !description ||
      !price ||
      !country ||
      !stateName ||
      !city ||
      !areaTotal ||
      !legalStatus
    ) {
      setError("Preencha os campos obrigatórios.");
      return;
    }

    if (latitude === null || longitude === null) {
      setError("Selecione a localização no mapa.");
      return;
    }

    if (existingImages.length + newImages.length === 0) {
      setError("Mantenha pelo menos uma imagem no anúncio.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        category,
        property_type: propertyType,
        title,
        description,
        price: Number(price),
        legal_status: legalStatus,
        area_total: areaTotal,
        area_built: areaBuilt,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        parking_spaces: parkingSpaces ? Number(parkingSpaces) : null,
        suites: suites ? Number(suites) : null,
        furnished,
        condominium,
        condominium_fee: condominiumFee ? Number(condominiumFee) : null,
        accepts_financing: acceptsFinancing,
        front_sea: frontSea,
        pool,
        country,
        state: stateName,
        city,
        neighborhood,
        street,
        address_number: addressNumber,
        zip_code: zipCode,
        google_maps_link: buildGoogleMapsLinkFromCoords(latitude, longitude),
        google_maps_thumbnail: buildGoogleMapsThumbnail(latitude, longitude),
        youtube_link: youtubeLink,
        youtube_thumbnail: buildYoutubeThumbnail(youtubeLink),
        topography_points: topographyPoints.filter(Boolean).join(","),
        latitude: Number(latitude),
        longitude: Number(longitude),
        images: [...existingImages.map((img) => img.imageUrl), ...newImages],
      };

      const res = await fetch(`/api/anunciar/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível atualizar o anúncio.");
      }

      setMessage("Anúncio atualizado com sucesso.");
      setTimeout(() => {
        router.push("/minha-conta/anuncios");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar anúncio.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Carregando anúncio...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="mb-8 text-4xl font-bold">Editar anúncio</h1>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="grid gap-4 lg:grid-cols-[320px_1fr_420px]"
        >
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">
              Categoria selecionada
            </div>
            <div className="mb-4 text-xl font-bold text-white">
              {formatLabel(category)}
            </div>

            <div className="mb-4 text-sm font-medium text-slate-300">
              Tipo do imóvel
            </div>

            <div className="space-y-3">
              {typeOptions.map((item) => {
                const active = propertyType === item;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPropertyType(item)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? "border-white bg-white text-slate-900"
                        : "border-white/10 bg-slate-900/70 text-white hover:bg-slate-800"
                    }`}
                  >
                    {formatLabel(item)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 space-y-6">
            <div>
              <div className="mb-4 text-sm font-medium text-slate-300">
                Dados do anúncio
              </div>

              <div className="space-y-4">
                <Field label="Título *">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
                </Field>

                <Grid2>
                  <Field label="Preço *">
                    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="input" />
                  </Field>
                  <Field label="Área total *">
                    <input value={areaTotal} onChange={(e) => setAreaTotal(e.target.value)} className="input" />
                  </Field>
                </Grid2>

                <Field label="Situação jurídica *">
                  <select value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)} className="input">
                    <option value="Regular">Regular</option>
                    <option value="Matrícula">Matrícula</option>
                    <option value="Escritura">Escritura</option>
                    <option value="Posse">Posse</option>
                    <option value="Usucapião">Usucapião</option>
                    <option value="Inventário">Inventário</option>
                    <option value="Leilão">Leilão</option>
                    <option value="Outro">Outro</option>
                  </select>
                </Field>

                <Field label="Área construída">
                  <input value={areaBuilt} onChange={(e) => setAreaBuilt(e.target.value)} className="input" />
                </Field>

                <Grid2>
                  <Field label="Quartos">
                    <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="input" />
                  </Field>
                  <Field label="Suítes">
                    <input type="number" value={suites} onChange={(e) => setSuites(e.target.value)} className="input" />
                  </Field>
                  <Field label="Banheiros">
                    <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className="input" />
                  </Field>
                  <Field label="Vagas">
                    <input type="number" value={parkingSpaces} onChange={(e) => setParkingSpaces(e.target.value)} className="input" />
                  </Field>
                </Grid2>

                <ToggleRow
                  items={[
                    { label: "Mobiliado", checked: furnished, onChange: setFurnished },
                    { label: "Condomínio", checked: condominium, onChange: setCondominium },
                    { label: "Piscina", checked: pool, onChange: setPool },
                    { label: "Frente mar", checked: frontSea, onChange: setFrontSea },
                    { label: "Aceita financiamento", checked: acceptsFinancing, onChange: setAcceptsFinancing },
                  ]}
                />

                {condominium && (
                  <Field label="Valor do condomínio">
                    <input
                      type="number"
                      value={condominiumFee}
                      onChange={(e) => setCondominiumFee(e.target.value)}
                      className="input"
                    />
                  </Field>
                )}

                {category === "TERRENOS" && (
                  <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                    <div className="mb-3 text-sm font-medium text-slate-300">
                      Pontos da planta topográfica
                    </div>

                    <div className="space-y-3">
                      {topographyPoints.map((point, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            value={point}
                            onChange={(e) => updateTopographyPoint(index, e.target.value)}
                            className="input"
                            placeholder={`Ponto ${index + 1}`}
                          />
                          {topographyPoints.length > 4 && (
                            <button
                              type="button"
                              onClick={() => removeTopographyPoint(index)}
                              className="rounded-xl border border-red-400/20 px-3 text-red-300"
                            >
                              -
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={addTopographyPoint}
                      className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                    >
                      + Adicionar ponto
                    </button>
                  </div>
                )}

                <Field label="Descrição *">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="input"
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="mb-4 text-sm font-medium text-slate-300">
                Endereço
              </div>

              <div className="space-y-4">
                <Grid2>
                  <Field label="País *">
                    <input value={country} onChange={(e) => setCountry(e.target.value)} className="input" />
                  </Field>
                  <Field label="Estado *">
                    <select
                      value={stateName}
                      onChange={(e) => {
                        setStateName(e.target.value);
                        setCity(""); 
                      }}
                      className="input"
                    >
                      <option value="">Selecione um estado</option>
                      {BRAZILIAN_STATES.map((state) => (
                        <option key={state.uf} value={state.name}>
                          {state.name} ({state.uf})
                        </option>
                      ))}
                    </select>
                  </Field>
                </Grid2>

                <Grid2>
                  <Field label="Cidade *">
                    {citiesList.length > 0 ? (
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="input"
                      >
                        <option value="">Selecione uma cidade</option>
                        {citiesList.map(c => (
                          <option key={c.nome} value={c.nome}>{c.nome}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="input"
                        placeholder={stateName ? "Carregando cidades..." : "Selecione o estado"}
                        disabled={!stateName}
                      />
                    )}
                  </Field>
                  <Field label="Bairro">
                    <NeighborhoodAutocomplete
                      value={neighborhood}
                      onChange={setNeighborhood}
                      onSelectCoordinates={setFlyToCoords}
                      city={city}
                      stateName={stateName}
                    />
                  </Field>
                </Grid2>

                <Grid2>
                  <Field label="Rua">
                    <input value={street} onChange={(e) => setStreet(e.target.value)} className="input" />
                  </Field>
                  <Field label="Número">
                    <input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className="input" />
                  </Field>
                </Grid2>

                <Field label="CEP">
                  <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="input" />
                </Field>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="mb-4 text-sm font-medium text-slate-300">
                Mídia do anúncio
              </div>

              <Field label="Link do YouTube">
                <input value={youtubeLink} onChange={(e) => setYoutubeLink(e.target.value)} className="input" />
              </Field>

              {youtubeThumbnail && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <img
                    src={youtubeThumbnail}
                    alt="Miniatura do vídeo"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 space-y-5">
            <div className="mb-4 text-sm font-medium text-slate-300">
              Localização e fotos
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="mb-3 text-sm text-slate-300">
                Marque o ponto exato do imóvel no globo
              </div>

              <PropertyLocationPicker
                latitude={latitude}
                longitude={longitude}
                flyToCoords={flyToCoords}
                onChange={(coords: { latitude: number; longitude: number }) => {
                  setLatitude(coords.latitude);
                  setLongitude(coords.longitude);
                }}
              />
            </div>

            <Grid2>
              <Field label="Latitude">
                <input value={latitude ?? ""} readOnly className="input opacity-80" />
              </Field>
              <Field label="Longitude">
                <input value={longitude ?? ""} readOnly className="input opacity-80" />
              </Field>
            </Grid2>

            <Field label="Link Google Maps gerado pelas coordenadas">
              <input value={googleMapsLink} readOnly className="input opacity-80" />
            </Field>

            {googleMapsThumbnail && (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  src={googleMapsThumbnail}
                  className="h-40 w-full"
                  loading="lazy"
                />
              </div>
            )}

            <Field label="Adicionar novas fotos">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="block w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300"
              />
            </Field>

            {existingImages.length > 0 && (
              <div>
                <div className="mb-2 text-sm text-slate-300">Fotos atuais</div>
                <div className="grid grid-cols-4 gap-2">
                  {existingImages.map((image) => (
                    <div
                      key={image.id}
                      className="overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                    >
                      <img
                        src={image.imageUrl}
                        alt="Foto atual"
                        className="h-20 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(image.id)}
                        className="w-full border-t border-white/10 px-2 py-1 text-xs text-red-300"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {newImages.length > 0 && (
              <div>
                <div className="mb-2 text-sm text-slate-300">Novas fotos</div>
                <div className="grid grid-cols-4 gap-2">
                  {newImages.map((image, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                    >
                      <img
                        src={image}
                        alt={`Nova foto ${index + 1}`}
                        className="h-20 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                        className="w-full border-t border-white/10 px-2 py-1 text-xs text-red-300"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-white px-4 py-4 font-semibold text-slate-900 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-60 mt-3"
            >
               Excluir anúncio
            </button>
          </div>
        </form>
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

function ToggleRow({
  items,
}: {
  items: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
  }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => item.onChange(!item.checked)}
          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
            item.checked
              ? "border-white bg-white text-slate-900"
              : "border-white/10 bg-slate-900/70 text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}