"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import PropertyLocationPicker from "@/components/PropertyLocationPicker";

const PROPERTY_CATEGORIES = [
  "RESIDENCIAL",
  "TERRENOS",
  "COMERCIAL",
  "INDUSTRIAL_LOGISTICO",
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
] as const;

const MAX_IMAGES = 20;
const MAX_IMAGE_SIZE_BYTES = 500 * 1024;
const MAX_DIMENSION = 1920;

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Não foi possível processar a imagem ${file.name}.`));
    };

    img.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao gerar a imagem comprimida."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

async function compressImageToMax500KB(file: File): Promise<File> {
  if (file.size <= MAX_IMAGE_SIZE_BYTES) {
    return file;
  }

  const img = await loadImageFromFile(file);

  let width = img.width;
  let height = img.height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Não foi possível preparar a compressão da imagem.");
  }

  ctx.drawImage(img, 0, 0, width, height);

  const targetType = "image/jpeg";
  const originalBaseName = file.name.replace(/\.[^.]+$/, "");
  let quality = 0.9;

  for (let attempt = 0; attempt < 8; attempt++) {
    const blob = await canvasToBlob(canvas, targetType, quality);

    if (blob.size <= MAX_IMAGE_SIZE_BYTES) {
      return new File([blob], `${originalBaseName}.jpg`, {
        type: targetType,
        lastModified: Date.now(),
      });
    }

    quality -= 0.1;
  }

  let resizeFactor = 0.9;

  for (let attempt = 0; attempt < 6; attempt++) {
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = Math.max(400, Math.round(width * resizeFactor));
    resizedCanvas.height = Math.max(400, Math.round(height * resizeFactor));

    const resizedCtx = resizedCanvas.getContext("2d");
    if (!resizedCtx) {
      throw new Error("Não foi possível redimensionar a imagem.");
    }

    resizedCtx.drawImage(img, 0, 0, resizedCanvas.width, resizedCanvas.height);

    let resizedQuality = 0.75;

    for (let qAttempt = 0; qAttempt < 6; qAttempt++) {
      const blob = await canvasToBlob(
        resizedCanvas,
        targetType,
        resizedQuality
      );

      if (blob.size <= MAX_IMAGE_SIZE_BYTES) {
        return new File([blob], `${originalBaseName}.jpg`, {
          type: targetType,
          lastModified: Date.now(),
        });
      }

      resizedQuality -= 0.1;
    }

    resizeFactor -= 0.1;
  }

  throw new Error(
    `Não foi possível reduzir "${file.name}" para até 500 KB. Tente uma imagem menor.`
  );
}

export default function AnunciarPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [user, setUser] = useState<any>(null);

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
  const [neighborhood, setNeighborhood] = useState("");
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

  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user) {
      setUser({
        id: Number((session.user as any).id),
        name: session.user.name,
        email: session.user.email,
        role: (session.user as any).role,
      });
    }
  }, [status, session, router]);

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

  function buildGoogleMapsThumbnail(lat: number | null, lng: number | null) {
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
    const id = extractYoutubeId(url);
    if (!id) return "";
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
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

  useEffect(() => {
    setGoogleMapsLink(buildGoogleMapsLinkFromCoords(latitude, longitude));
    setGoogleMapsThumbnail(buildGoogleMapsThumbnail(latitude, longitude));
  }, [latitude, longitude]);

  useEffect(() => {
    setYoutubeThumbnail(buildYoutubeThumbnail(youtubeLink));
  }, [youtubeLink]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  function selectCategory(nextCategory: string) {
    setCategory(nextCategory);
    setPropertyType("");
    setAreaBuilt("");
    setBedrooms("");
    setBathrooms("");
    setParkingSpaces("");
    setSuites("");
    setFurnished(false);
    setCondominium(false);
    setCondominiumFee("");
    setAcceptsFinancing(false);
    setFrontSea(false);
    setPool(false);
    setTopographyPoints(["", "", "", ""]);
  }

  function goBackToCategories() {
    setCategory("");
    setPropertyType("");
  }

  async function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");

    const totalAfterAdd = images.length + files.length;
    if (totalAfterAdd > MAX_IMAGES) {
      setError(`Você pode adicionar no máximo ${MAX_IMAGES} fotos por anúncio.`);
      e.target.value = "";
      return;
    }

    try {
      setUploadingImages(true);

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      const invalidType = files.find((file) => !allowedTypes.includes(file.type));

      if (invalidType) {
        throw new Error(
          `A imagem "${invalidType.name}" tem formato inválido. Use JPG, PNG ou WEBP.`
        );
      }

      const processedFiles = await Promise.all(
        files.map((file) => compressImageToMax500KB(file))
      );

      const invalidSize = processedFiles.find(
        (file) => file.size > MAX_IMAGE_SIZE_BYTES
      );

      if (invalidSize) {
        throw new Error(
          `A imagem "${invalidSize.name}" ainda ficou acima de 500 KB.`
        );
      }

      setImages((prev) => [...prev, ...processedFiles]);
      setImagePreviews((prev) => [
        ...prev,
        ...processedFiles.map((file) => URL.createObjectURL(file)),
      ]);
    } catch (err: any) {
      setError(err.message || "Erro ao processar as imagens.");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const urlToRemove = prev[index];
      if (urlToRemove?.startsWith("blob:")) {
        URL.revokeObjectURL(urlToRemove);
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadImagesAndGetUrls() {
    const uploadedUrls: string[] = [];

    try {
      setUploadingImages(true);

      for (const file of images) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        const raw = await res.text();

        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {
          data = {
            success: false,
            error: raw || "Resposta inválida do upload.",
          };
        }

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao enviar imagem.");
        }

        if (!data.imageUrl) {
          throw new Error("A API de upload não retornou a URL da imagem.");
        }

        uploadedUrls.push(data.imageUrl);
      }

      return uploadedUrls;
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!user?.id) {
      setError("Usuário não autenticado.");
      return;
    }

    if (!category) {
      setError("Selecione a categoria do imóvel.");
      return;
    }

    if (!propertyType) {
      setError("Selecione o tipo do imóvel.");
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

    if (images.length === 0) {
      setError("Adicione pelo menos uma imagem.");
      return;
    }

    if (images.length > MAX_IMAGES) {
      setError(`O anúncio pode ter no máximo ${MAX_IMAGES} fotos.`);
      return;
    }

    try {
      setLoading(true);

      const uploadedImageUrls = await uploadImagesAndGetUrls();

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
        youtube_thumbnail: youtubeThumbnail,

        topography_points: topographyPoints.filter(Boolean).join(","),

        latitude: Number(latitude),
        longitude: Number(longitude),

        images: uploadedImageUrls,
      };

      const res = await fetch("/api/anunciar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();

      let data: any = null;

      try {
        data = JSON.parse(raw);
      } catch {
        data = {
          success: false,
          error: raw || "Resposta inválida da API.",
        };
      }

      if (!res.ok || !data.success) {
        setError(data?.error || data?.details || "Erro ao publicar anúncio.");
        return;
      }

      setMessage("Anúncio publicado com sucesso.");

      setTimeout(() => {
        router.push("/anunciar/sucesso");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function renderSpecificFields() {
    if (!propertyType) return null;

    if (category === "RESIDENCIAL") {
      return (
        <>
          <Field label="Área construída">
            <input
              value={areaBuilt}
              onChange={(e) => setAreaBuilt(e.target.value)}
              className="input"
              placeholder="Ex.: 180 m²"
            />
          </Field>

          <Grid2>
            <Field label="Quartos">
              <input
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Suítes">
              <input
                type="number"
                value={suites}
                onChange={(e) => setSuites(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Banheiros">
              <input
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Vagas">
              <input
                type="number"
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(e.target.value)}
                className="input"
              />
            </Field>
          </Grid2>

          <ToggleRow
            items={[
              { label: "Mobiliado", checked: furnished, onChange: setFurnished },
              {
                label: "Condomínio",
                checked: condominium,
                onChange: setCondominium,
              },
              { label: "Piscina", checked: pool, onChange: setPool },
              { label: "Frente mar", checked: frontSea, onChange: setFrontSea },
              {
                label: "Aceita financiamento",
                checked: acceptsFinancing,
                onChange: setAcceptsFinancing,
              },
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
        </>
      );
    }

    if (category === "TERRENOS") {
      return (
        <>
          <ToggleRow
            items={[
              {
                label: "Aceita financiamento",
                checked: acceptsFinancing,
                onChange: setAcceptsFinancing,
              },
              {
                label: "Condomínio",
                checked: condominium,
                onChange: setCondominium,
              },
              { label: "Frente mar", checked: frontSea, onChange: setFrontSea },
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
                    placeholder={`Ponto ${index + 1} - ex.: -3.217200,-39.269000`}
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
        </>
      );
    }

    if (category === "COMERCIAL") {
      return (
        <>
          <Field label="Área construída / útil">
            <input
              value={areaBuilt}
              onChange={(e) => setAreaBuilt(e.target.value)}
              className="input"
              placeholder="Ex.: 320 m²"
            />
          </Field>

          <Grid2>
            <Field label="Banheiros">
              <input
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Vagas">
              <input
                type="number"
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(e.target.value)}
                className="input"
              />
            </Field>
          </Grid2>

          <ToggleRow
            items={[
              {
                label: "Condomínio",
                checked: condominium,
                onChange: setCondominium,
              },
              { label: "Mobiliado", checked: furnished, onChange: setFurnished },
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
        </>
      );
    }

    if (category === "INDUSTRIAL_LOGISTICO") {
      return (
        <>
          <Field label="Área construída">
            <input
              value={areaBuilt}
              onChange={(e) => setAreaBuilt(e.target.value)}
              className="input"
              placeholder="Ex.: 5.000 m²"
            />
          </Field>

          <Grid2>
            <Field label="Banheiros">
              <input
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Vagas">
              <input
                type="number"
                value={parkingSpaces}
                onChange={(e) => setParkingSpaces(e.target.value)}
                className="input"
              />
            </Field>
          </Grid2>
        </>
      );
    }

    return null;
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-slate-400">Carregando...</div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <div className="text-sm text-slate-400">Publicação de anúncio</div>
          <h1 className="mt-2 text-4xl font-bold">Anunciar imóvel</h1>
          <p className="mt-2 max-w-4xl text-slate-400">
            Escolha a categoria, depois o tipo, preencha os dados do anúncio e
            endereço, e finalize com localização, mídia e fotos.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-[320px_1fr_420px]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              {!category ? (
                <>
                  <div className="mb-4 text-sm font-medium text-slate-300">
                    1. Categoria
                  </div>

                  <div className="space-y-3">
                    {PROPERTY_CATEGORIES.map((item) => {
                      const active = category === item;

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => selectCategory(item)}
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
                </>
              ) : (
                <>
                  <div className="mb-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    Categoria selecionada
                  </div>
                  <div className="mb-4 text-xl font-bold text-white">
                    {formatLabel(category)}
                  </div>

                  <div className="mb-4 text-sm font-medium text-slate-300">
                    2. Tipo do imóvel
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

                  <button
                    type="button"
                    onClick={goBackToCategories}
                    className="mt-4 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-300 hover:bg-white/10"
                  >
                    Voltar
                  </button>
                </>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              {!propertyType ? (
                <div className="text-sm text-slate-500">
                  Escolha uma categoria e depois o tipo do imóvel para abrir os
                  campos do anúncio.
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <div className="mb-4 text-sm font-medium text-slate-300">
                      3. Dados do anúncio
                    </div>

                    <div className="space-y-4">
                      <Field label="Título *">
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="input"
                          placeholder="Ex.: Casa de praia em Flecheiras"
                        />
                      </Field>

                      <Grid2>
                        <Field label="Preço *">
                          <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="input"
                            placeholder="Ex.: 850000"
                          />
                        </Field>

                        <Field label="Área total *">
                          <input
                            value={areaTotal}
                            onChange={(e) => setAreaTotal(e.target.value)}
                            className="input"
                            placeholder="Ex.: 450 m²"
                          />
                        </Field>
                      </Grid2>

                      <Field label="Situação jurídica *">
                        <select
                          value={legalStatus}
                          onChange={(e) => setLegalStatus(e.target.value)}
                          className="input"
                        >
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

                      {renderSpecificFields()}

                      <Field label="Descrição *">
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={6}
                          className="input"
                          placeholder="Descreva o imóvel, diferenciais, documentação e localização."
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <div className="mb-4 text-sm font-medium text-slate-300">
                      4. Endereço
                    </div>

                    <div className="space-y-4">
                      <Grid2>
                        <Field label="País *">
                          <input
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="input"
                            placeholder="Ex.: Brasil"
                          />
                        </Field>

                        <Field label="Estado *">
                          <select
                            value={stateName}
                            onChange={(e) => setStateName(e.target.value)}
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
                          <input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="input"
                            placeholder="Ex.: Trairi"
                          />
                        </Field>

                        <Field label="Bairro">
                          <input
                            value={neighborhood}
                            onChange={(e) => setNeighborhood(e.target.value)}
                            className="input"
                            placeholder="Ex.: Flecheiras"
                          />
                        </Field>
                      </Grid2>

                      <Grid2>
                        <Field label="Rua">
                          <input
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            className="input"
                            placeholder="Ex.: Rua Beira Mar"
                          />
                        </Field>

                        <Field label="Número">
                          <input
                            value={addressNumber}
                            onChange={(e) => setAddressNumber(e.target.value)}
                            className="input"
                            placeholder="Ex.: 125"
                          />
                        </Field>
                      </Grid2>

                      <Field label="CEP">
                        <input
                          value={zipCode}
                          onChange={(e) => setZipCode(e.target.value)}
                          className="input"
                          placeholder="Ex.: 62690-000"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <div className="mb-4 text-sm font-medium text-slate-300">
                      5. Mídia do anúncio
                    </div>

                    <div className="space-y-4">
                      <Field label="Link do YouTube">
                        <input
                          value={youtubeLink}
                          onChange={(e) => setYoutubeLink(e.target.value)}
                          className="input"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </Field>

                      {youtubeThumbnail && (
                        <div className="overflow-hidden rounded-2xl border border-white/10">
                          <img
                            src={youtubeThumbnail}
                            alt="Miniatura do vídeo"
                            className="h-40 w-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
              {!propertyType ? (
                <div className="text-sm text-slate-500">
                  Depois de escolher o tipo do imóvel, a localização, miniatura
                  do mapa e as fotos aparecerão aqui.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="mb-4 text-sm font-medium text-slate-300">
                    6. Localização e fotos
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <div className="mb-3 text-sm text-slate-300">
                      Marque o ponto exato do imóvel no globo
                    </div>

                    <PropertyLocationPicker
                      latitude={latitude}
                      longitude={longitude}
                      onChange={(coords: { latitude: number; longitude: number }) => {
                        setLatitude(coords.latitude);
                        setLongitude(coords.longitude);
                      }}
                    />
                  </div>

                  <Grid2>
                    <Field label="Latitude">
                      <input
                        value={latitude ?? ""}
                        readOnly
                        className="input opacity-80"
                      />
                    </Field>

                    <Field label="Longitude">
                      <input
                        value={longitude ?? ""}
                        readOnly
                        className="input opacity-80"
                      />
                    </Field>
                  </Grid2>

                  <Field label="Link Google Maps gerado pelas coordenadas">
                    <input
                      value={googleMapsLink}
                      readOnly
                      className="input opacity-80"
                    />
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

                  <Field label={`Fotos do imóvel * (máx. ${MAX_IMAGES}, até 500 KB cada)`}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleFilesChange}
                      className="block w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300"
                    />
                  </Field>

                  <div className="text-xs text-slate-400">
                    {images.length}/{MAX_IMAGES} fotos selecionadas
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {imagePreviews.map((image, index) => (
                        <div
                          key={index}
                          className="overflow-hidden rounded-xl border border-white/10 bg-slate-900"
                        >
                          <img
                            src={image}
                            alt={`Foto ${index + 1}`}
                            className="h-20 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="w-full border-t border-white/10 px-2 py-1 text-xs text-red-300"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || uploadingImages}
                    className="w-full rounded-2xl bg-white px-4 py-4 font-semibold text-slate-900 disabled:opacity-60"
                  >
                    {uploadingImages
                      ? "Processando imagens..."
                      : loading
                      ? "Publicando..."
                      : "Publicar anúncio"}
                  </button>
                </div>
              )}
            </div>
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