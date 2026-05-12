"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  rectSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Sparkles, Upload, Music, ChevronRight, Camera, LayoutGrid, Home, FileText, MapPin, Video, Map } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import PropertyLocationPicker from "@/components/PropertyLocationPicker";
import NeighborhoodAutocomplete from "@/components/NeighborhoodAutocomplete";

function SortableItem({ id, children }: { id: string | number, children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

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

function AnunciarFormContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [isEditing, setIsEditing] = useState(false);

  // Estados para URLs existentes (Edição)
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);
  const [existingMusicUrl, setExistingMusicUrl] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEndImages = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setImagePreviews((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        
        // Sincronizar o estado 'images' (os arquivos reais)
        setImages((prevImages) => {
          const newFiles = [...prevImages];
          const movedFile = newFiles[oldIndex];
          newFiles.splice(oldIndex, 1);
          newFiles.splice(newIndex, 0, movedFile);
          return newFiles;
        });

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragEndExistingImages = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setExistingImageUrls((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragEndVideos = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setExistingVideoUrls((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragEndNewVideos = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setVideoPreviews((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        
        // Sincronizar os arquivos reais simultaneamente
        setVideos((prev) => {
          const newFiles = [...prev];
          const [movedFile] = newFiles.splice(oldIndex, 1);
          newFiles.splice(newIndex, 0, movedFile);
          return newFiles;
        });

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

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

  const [neighborhood, setNeighborhood] = useState("");
  const [flyToCoords, setFlyToCoords] = useState<{ latitude: number; longitude: number; zoomLevel?: number } | null>(null);
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

  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [processingVideos, setProcessingVideos] = useState(false);

  const [reelsMusic, setReelsMusic] = useState<File | null>(null);
  const [reelsMusicPreview, setReelsMusicPreview] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (editId && status === "authenticated") {
      setIsEditing(true);
      fetchProperty(Number(editId));
    }
  }, [editId, status]);

  async function fetchProperty(id: number) {
    try {
      setLoading(true);
      const res = await fetch(`/api/anunciar/${id}`);
      const data = await res.json();
      if (data.success && data.property) {
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
        setFurnished(!!p.furnished);
        setCondominium(!!p.condominium);
        setCondominiumFee(p.condominiumFee?.toString() || "");
        setAcceptsFinancing(!!p.acceptsFinancing);
        setFrontSea(!!p.frontSea);
        setPool(!!p.pool);
        setStateName(p.state || "");
        setCity(p.city || "");
        setNeighborhood(p.neighborhood || "");
        setStreet(p.street || "");
        setAddressNumber(p.addressNumber || "");
        setZipCode(p.zipCode || "");
        setLatitude(Number(p.latitude));
        setLongitude(Number(p.longitude));
        setYoutubeLink(p.youtubeLink || "");
        
        if (p.topographyPoints) {
           setTopographyPoints(p.topographyPoints.split(","));
        }

        // Mídia existente
        setExistingImageUrls(p.images?.map((img: any) => img.imageUrl) || []);
        setExistingVideoUrls(p.videos?.map((vid: any) => vid.videoUrl) || []);
        setExistingMusicUrl(p.reelsMusicUrl || "");
      }
    } catch (e) {
      console.error("Erro ao carregar imóvel para edição:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function geocodeLocation() {
      if (!stateName) return;

      const queries = [];
      
      if (street && city) {
        queries.push({
          q: `${street}${addressNumber ? ', ' + addressNumber : ''}, ${neighborhood ? neighborhood + ', ' : ''}${city}, ${stateName}, Brasil`,
          z: addressNumber ? 400 : 1000
        });
      }
      
      if (neighborhood && city) {
        queries.push({
          q: `${neighborhood}, ${city}, ${stateName}, Brasil`,
          z: 3000
        });
      }
      
      if (city) {
        queries.push({
          q: `${city}, ${stateName}, Brasil`,
          z: 15000
        });
      }
      
      queries.push({
        q: `${stateName}, Brasil`,
        z: 700000
      });

      for (const item of queries) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              item.q
            )}&limit=1`
          );
          const data = await res.json();

          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setFlyToCoords({ latitude: lat, longitude: lon, zoomLevel: item.z });
            break;
          }
        } catch (err) {
          console.error("Erro na geocodificação:", item.q, err);
        }
      }
    }

    const timeoutId = setTimeout(() => {
      geocodeLocation();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [stateName, city, neighborhood, street, addressNumber]);

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

  function removeExistingVideo(index: number) {
    setExistingVideoUrls(prev => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(index: number) {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
  }

  function removeExistingMusic() {
    setExistingMusicUrl("");
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

  async function handleVideosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");
    const totalClips = (existingVideoUrls?.length || 0) + videos.length + files.length;
    
    if (totalClips > 10) {
      alert("Você só pode selecionar até 10 clipes no total. Selecione apenas 10 vídeos e tente de novo.");
      e.target.value = "";
      return;
    }

    try {
      setProcessingVideos(true);
      const allowedTypes = ["video/mp4", "video/quicktime", "video/webm"];
      
      const processedFiles = await Promise.all(files.map(async (file) => {
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`O arquivo "${file.name}" não é um vídeo suportado.`);
        }
        // No futuro, aqui podemos injetar metadados de corte se necessário
        return file;
      }));

      setVideos(prev => [...prev, ...processedFiles]);
      setVideoPreviews(prev => [...prev, ...processedFiles.map(f => URL.createObjectURL(f))]);
    } catch (err: any) {
      setError(err.message || "Erro ao processar vídeos.");
    } finally {
      setProcessingVideos(false);
      e.target.value = "";
    }
  }

  function removeVideo(index: number) {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => {
      const urlToRemove = prev[index];
      if (urlToRemove?.startsWith("blob:")) URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== index);
    });
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

    if (images.length === 0 && existingImageUrls.length === 0 && videos.length === 0 && existingVideoUrls.length === 0) {
      setError("Adicione pelo menos uma mídia (foto ou vídeo).");
      return;
    }

    if (images.length > MAX_IMAGES) {
      setError(`O anúncio pode ter no máximo ${MAX_IMAGES} fotos.`);
      return;
    }

    try {
      setUploadingImages(true);
      setUploadProgress(5);
      setStatusMessage("Preparando arquivos...");

      const totalSteps = images.length + (reelsMusic ? 1 : 0) + videos.length + 1; // +1 for final save
      let currentStep = 0;

      const updateProgress = (msg: string) => {
        currentStep++;
        const pct = Math.round((currentStep / totalSteps) * 90) + 5;
        setUploadProgress(pct);
        setStatusMessage(msg);
      };

      // Upload de Imagens
      const uploadedImageUrls: string[] = [];
      if (images.length > 0) {
        for (const image of images) {
            updateProgress(`Enviando fotos (${uploadedImageUrls.length + 1}/${images.length})...`);
            const formData = new FormData();
            formData.append("file", image);
            const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
            const data = await uploadRes.json();
            if (data.success) uploadedImageUrls.push(data.imageUrl);
        }
      }
      
      // Upload de Música do Reel
      let uploadedMusicUrl = "";
      if (reelsMusic) {
          updateProgress("Enviando trilha sonora...");
          const formData = new FormData();
          formData.append("file", reelsMusic);
          const res = await fetch("/api/upload-image", {
              method: "POST",
              body: formData,
          });
          const data = await res.json();
          if (data.success) uploadedMusicUrl = data.imageUrl;
      }

      // Upload de Vídeos
      const uploadedVideoUrls: string[] = [];
      if (videos.length > 0) {
          for (const file of videos) {
              updateProgress(`Enviando vídeos (${uploadedVideoUrls.length + 1}/${videos.length})...`);
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/upload-image", {
                  method: "POST",
                  body: formData,
              });
              const data = await res.json();
              if (data.success) uploadedVideoUrls.push(data.imageUrl);
          }
      }

      updateProgress("Finalizando publicação no banco de dados...");

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

        // Combinar URLs existentes com novos uploads
        images: [...existingImageUrls, ...uploadedImageUrls],
        videos: [...existingVideoUrls, ...uploadedVideoUrls],
        reels_music_url: uploadedMusicUrl || existingMusicUrl,
      };

      const endpoint = isEditing ? `/api/anunciar/${editId}` : "/api/anunciar";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
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
    return <LoadingScreen title="Carregando" subtitle="Validando sua sessão de usuário..." />;
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
    return null;
  }

  if (uploadingImages) {
    return <LoadingScreen title={statusMessage} subtitle={`${uploadProgress}% concluído`} />;
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
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-lg">
                       <LayoutGrid size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">1. Categoria</h3>
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Base do Anúncio</p>
                    </div>
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

                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-lg">
                       <Home size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">2. Tipo do imóvel</h3>
                       <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Especificação</p>
                    </div>
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
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                         <FileText size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">3. Dados do anúncio</h3>
                         <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Informações Essenciais</p>
                      </div>
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
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                         <MapPin size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">4. Endereço</h3>
                         <p className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Localização Geográfica</p>
                      </div>
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
                              {citiesList.map((c) => (
                                <option key={c.nome} value={c.nome}>{c.nome}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="input"
                              placeholder={stateName ? "Carregando cidades..." : "Ex.: Trairi"}
                              disabled={!!stateName && citiesList.length === 0}
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
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/20">
                         <Video size={24} />
                      </div>
                      <div>
                         <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">5. Vídeo YouTube</h3>
                         <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">Exposição Audiovisual</p>
                      </div>
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
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/20">
                       <Map size={24} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">6. Localização no Mapa</h3>
                       <p className="text-[9px] text-sky-400 font-black uppercase tracking-widest">Precisão de Satélite</p>
                    </div>
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
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 space-y-8">
             {/* SECAO DE FOTOS DO IMOVEL - PREMIUM LAYOUT */}
             <div className="w-full relative group overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/40 p-6 md:p-8 shadow-2xl transition-all hover:border-white/20">
                <div className="relative z-10 space-y-8">
                   <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xl shadow-blue-500/20">
                         <Camera size={28} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">7. Galeria de Fotos</h3>
                         <p className="text-[10px] text-sky-400 font-black uppercase tracking-[0.2em]">Gestão Visual de Alta Conversão</p>
                      </div>
                   </div>

                   <div className="grid gap-8 md:grid-cols-2">
                      <div className="space-y-6">
                         <Field label={`Upload de Fotos * (máx. ${MAX_IMAGES})`}>
                            <input
                              key="image-input-field"
                              id="property-images-input"
                              name="images"
                              type="file"
                              multiple={true}
                              onChange={handleFilesChange}
                              className="block w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-slate-300"
                            />
                         </Field>

                         <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                            <div className="flex items-start gap-3">
                               <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                                  <span className="text-[10px] font-bold">i</span>
                               </div>
                               <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                                  <strong className="text-slate-200">Dica RealStock:</strong> Arraste as fotos para organizar. A primeira imagem será o destaque principal do seu imóvel.
                               </p>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         {existingImageUrls.length > 0 && (
                            <div className="space-y-3">
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fotos Ativas:</div>
                               <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndExistingImages}>
                                  <SortableContext items={existingImageUrls} strategy={rectSortingStrategy}>
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {existingImageUrls.map((url, index) => (
                                           <SortableItem key={url} id={url}>
                                              <div className="overflow-hidden rounded-xl border border-sky-500/30 bg-sky-500/5">
                                                 <div className="relative h-24 bg-slate-900">
                                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-sky-500 text-[8px] font-black text-white uppercase tracking-tighter">Ativo</div>
                                                 </div>
                                                 <button
                                                   type="button"
                                                   onClick={() => removeExistingImage(index)}
                                                   className="w-full border-t border-sky-500/20 px-2 py-1 text-[10px] font-bold text-sky-300 hover:bg-sky-500/10 transition-colors"
                                                 >
                                                   Remover
                                                 </button>
                                              </div>
                                           </SortableItem>
                                        ))}
                                     </div>
                                  </SortableContext>
                               </DndContext>
                            </div>
                         )}

                         {imagePreviews.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-white/5">
                               <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fotos Selecionadas ({imagePreviews.length}/{MAX_IMAGES}):</div>
                               <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndImages}>
                                  <SortableContext items={imagePreviews} strategy={rectSortingStrategy}>
                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {imagePreviews.map((image, index) => (
                                           <SortableItem key={image} id={image}>
                                              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                                                 <div className="relative h-24 bg-slate-950">
                                                    <img src={image} alt="" className="w-full h-full object-cover" />
                                                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white text-[8px] font-black text-slate-900 uppercase tracking-tighter">Novo</div>
                                                 </div>
                                                 <button
                                                   type="button"
                                                   onClick={() => removeImage(index)}
                                                   className="w-full border-t border-white/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                                                 >
                                                   Remover
                                                 </button>
                                              </div>
                                           </SortableItem>
                                        ))}
                                     </div>
                                  </SortableContext>
                               </DndContext>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>

             {/* SECAO DE REELS - PREMIUM REDESIGN */}
             <div className="lg:col-span-3 relative group overflow-hidden rounded-[32px] border border-purple-500/30 bg-slate-900/50 p-6 md:p-8 shadow-2xl transition-all hover:border-purple-500/50">
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 space-y-8">
                   <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-xl shadow-purple-500/20">
                         <Sparkles size={28} />
                      </div>
                      <div>
                         <h3 className="text-2xl font-black text-white tracking-tighter uppercase italic">8. Mídias para o Reels IA</h3>
                         <p className="text-[10px] text-purple-400 font-black uppercase tracking-[0.2em]">Tecnologia de Viralização RealStock</p>
                      </div>
                   </div>

                   <div className="grid gap-8 sm:grid-cols-2">
                      <div className="space-y-6">
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                               <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Clipagem Estratégica</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">MÁX. 10 CLIPES</span>
                         </div>

                         <div className="relative">
                            <input
                              key="video-input-field"
                              id="reels-videos-input"
                              name="videos"
                              type="file"
                              multiple={true}
                              onChange={handleVideosChange}
                              className="hidden"
                            />
                            <label 
                              htmlFor="reels-videos-input"
                              className="flex flex-col items-center justify-center gap-3 p-8 rounded-3xl border-2 border-dashed border-white/10 bg-slate-950/50 hover:bg-slate-900 hover:border-purple-500/50 cursor-pointer transition-all group/upload"
                            >
                               <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover/upload:scale-110 group-hover/upload:text-purple-400 transition-all">
                                  <Upload size={24} />
                               </div>
                               <div className="text-center">
                                  <div className="text-xs font-bold text-white uppercase tracking-widest mb-1">Selecionar Vídeos</div>
                                  <div className="text-[10px] text-slate-500 uppercase">MP4 ou MOV • Até 10 segundos cada</div>
                               </div>
                            </label>
                         </div>

                         <div className="flex items-center justify-between px-2">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status da Composição</div>
                            <div className={`text-xs font-black italic ${videos.length + (existingVideoUrls?.length || 0) >= 10 ? 'text-purple-400' : 'text-sky-400'}`}>
                               {processingVideos ? "PROCESSANDO..." : `${videos.length + (existingVideoUrls?.length || 0)}/10 CLIPES`}
                            </div>
                         </div>

                         <div className="space-y-4">
                            {((existingVideoUrls?.length || 0) > 0 || videoPreviews.length > 0) && (
                               <div className="space-y-6">
                                  {(existingVideoUrls?.length || 0) > 0 && (
                                     <div>
                                        <div className="mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vídeos Ativos:</div>
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndVideos}>
                                           <SortableContext items={existingVideoUrls || []} strategy={rectSortingStrategy}>
                                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                 {existingVideoUrls?.map((url, index) => (
                                                    <SortableItem key={url} id={url}>
                                                       <div className="overflow-hidden rounded-xl border border-purple-500/30 bg-purple-500/5">
                                                          <div className="relative h-24 bg-slate-900">
                                                             <video src={`${url}#t=0.001`} preload="metadata" muted playsInline crossOrigin="anonymous" className="w-full h-full object-cover" />
                                                             <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-purple-500 text-[8px] font-black text-white uppercase tracking-tighter">Ativo</div>
                                                          </div>
                                                          <button
                                                              type="button"
                                                              onClick={() => removeExistingVideo(index)}
                                                              className="w-full border-t border-purple-500/20 px-2 py-1 text-[10px] font-bold text-purple-300 hover:bg-purple-500/10 transition-colors"
                                                          >
                                                              Remover
                                                          </button>
                                                       </div>
                                                    </SortableItem>
                                                 ))}
                                              </div>
                                           </SortableContext>
                                        </DndContext>
                                     </div>
                                  )}

                                  {videoPreviews.length > 0 && (
                                     <div>
                                        <div className="mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Novos Clipes (Upload):</div>
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndNewVideos}>
                                           <SortableContext items={videoPreviews} strategy={rectSortingStrategy}>
                                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                 {videoPreviews.map((video, index) => (
                                                    <SortableItem key={video} id={video}>
                                                       <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                                                          <div className="relative h-24 bg-slate-950">
                                                             <video src={`${video}#t=0.001`} preload="metadata" muted playsInline crossOrigin="anonymous" className="w-full h-full object-cover" />
                                                             <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-sky-500 text-[8px] font-black text-white uppercase tracking-tighter">Novo</div>
                                                          </div>
                                                          <button
                                                              type="button"
                                                              onClick={() => removeVideo(index)}
                                                              className="w-full border-t border-white/10 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                                                          >
                                                              Remover
                                                          </button>
                                                       </div>
                                                    </SortableItem>
                                                 ))}
                                              </div>
                                           </SortableContext>
                                        </DndContext>
                                     </div>
                                  )}
                               </div>
                            )}
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Trilha Sonora</span>
                         </div>

                         <div className="relative">
                            <input
                              id="reels-music-input"
                              type="file"
                              accept="audio/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setReelsMusic(file);
                                if (file) {
                                    setExistingMusicUrl(""); 
                                    const url = URL.createObjectURL(file);
                                    setReelsMusicPreview(url);
                                }
                              }}
                              className="hidden"
                            />
                            <label 
                              htmlFor="reels-music-input"
                              className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-slate-950/50 hover:bg-slate-900 cursor-pointer transition-all group/music"
                            >
                               <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover/music:scale-110 transition-transform">
                                  <Music size={24} />
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-white truncate uppercase tracking-widest">
                                     {reelsMusic ? reelsMusic.name : existingMusicUrl ? "Trilha sonora ativa" : "Escolher Trilha Sonora"}
                                  </div>
                                  <div className="text-[10px] text-slate-500 uppercase">Personalize seu Reels</div>
                               </div>
                            </label>
                         </div>

                         {(reelsMusicPreview || existingMusicUrl) && (
                            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Preview do Áudio</span>
                                  <button 
                                     type="button" 
                                     onClick={() => {
                                        setReelsMusic(null);
                                        setReelsMusicPreview("");
                                        setExistingMusicUrl("");
                                     }}
                                     className="text-red-400 hover:text-red-300 transition-colors"
                                  >
                                     <X size={14} />
                                  </button>
                               </div>
                               <audio src={reelsMusicPreview || existingMusicUrl} controls className="w-full h-8" />
                            </div>
                         )}

                         <div className="p-6 rounded-[24px] bg-indigo-500/10 border border-indigo-500/20 relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-10 text-indigo-400 rotate-12">
                               <Sparkles size={80} />
                            </div>
                            <div className="relative z-10">
                               <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                                  <strong className="text-slate-200">Dica Estratégica:</strong> Selecione até 10 clipes. O sistema usará o miolo de 6 segundos de cada um para criar um Reels dinâmico e sincronizado com a música.
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="pt-8">
               <button
                 type="submit"
                 disabled={loading || uploadingImages}
                 className="w-full group relative overflow-hidden rounded-[24px] bg-white px-8 py-8 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-2xl shadow-white/10"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                 <span className="relative z-10 flex items-center justify-center gap-3 text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                    {loading || uploadingImages ? "Processando..." : (isEditing ? "Salvar Alterações do Anúncio" : "Publicar anúncio")}
                    <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
                 </span>
               </button>
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

export default function AnunciarPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AnunciarFormContent />
    </Suspense>
  );
}