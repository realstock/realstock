"use client";

import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  rectSortingStrategy, 
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Film, Music, Play, GripVertical, Camera, Trash2, ChevronRight, ArrowLeft, Sparkles, Upload, LayoutGrid, Home, FileText, MapPin, Video, Map } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import PropertyLocationPicker from "@/components/PropertyLocationPicker";
import NeighborhoodAutocomplete from "@/components/NeighborhoodAutocomplete";

const MAX_IMAGES = 30;

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

// Componente para item arrastável
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
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {children}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing border border-white/10"
      >
        <GripVertical size={14} className="text-white" />
      </button>
    </div>
  );
}

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB
const MAX_DIMENSION = 1920;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem para compressão."));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Falha ao converter canvas para blob."));
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
  for (let attempt = 0; attempt < 3; attempt++) {
    width = Math.round(width * resizeFactor);
    height = Math.round(height * resizeFactor);
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    const blob = await canvasToBlob(canvas, targetType, 0.5);
    if (blob.size <= MAX_IMAGE_SIZE_BYTES) {
      return new File([blob], `${originalBaseName}.jpg`, {
        type: targetType,
        lastModified: Date.now(),
      });
    }
    resizeFactor -= 0.2;
  }

  throw new Error("Não foi possível comprimir a imagem para menos de 500 KB.");
}

function EditarAnuncioContent() {
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

  const [neighborhood, setNeighborhood] = useState("");
  const [flyToCoords, setFlyToCoords] = useState<{ latitude: number; longitude: number; zoomLevel?: number } | null>(null);
  const [street, setStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [googleMapsThumbnail, setGoogleMapsThumbnail] = useState("");

  const [youtubeLink, setYoutubeLink] = useState("");
  const [youtubeThumbnail, setYoutubeThumbnail] = useState("");

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

      // Lista de queries da mais específica para a mais genérica
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
            break; // Para no primeiro sucesso
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


  const [topographyPoints, setTopographyPoints] = useState<string[]>([
    "",
    "",
    "",
    "",
  ]);

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<{id: string, file: File, preview: string}[]>([]);

  // REELS MEDIA STATES
  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [existingVideoUrls, setExistingVideoUrls] = useState<string[]>([]);
  
  const [reelsMusic, setReelsMusic] = useState<File | null>(null);
  const [reelsMusicPreview, setReelsMusicPreview] = useState<string>("");
  const [existingMusicUrl, setExistingMusicUrl] = useState<string>("");

  const [processingVideos, setProcessingVideos] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEndExistingImages = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setExistingImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragEndNewImages = useCallback((event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setNewImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
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

    setError("");

    const totalAfterAdd = existingImages.length + newImages.length + files.length;
    if (totalAfterAdd > 10) {
      setError(`Você pode ter no máximo 10 fotos ativas no total.`);
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

      // Comprime as fotos para no máximo 500KB e formata para JPG
      const processedFiles = await Promise.all(
        files.map((file) => compressImageToMax500KB(file))
      );

      const newItems = processedFiles.map(file => ({
        id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        preview: URL.createObjectURL(file)
      }));

      setNewImages((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      setError(err.message || "Erro ao processar as imagens.");
    } finally {
      setUploadingImages(false);
      e.target.value = "";
    }
  }

  async function handleVideosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    console.log("📂 Arquivos selecionados:", files.length);
    
    if (!files.length) return;

    setProcessingVideos(true);
    try {
      // Filtro mais relaxado para aceitar qualquer vídeo
      const validVideos = files.filter(f => f.type.includes('video') || f.name.match(/\.(mp4|mov|webm|m4v|avi|mkv)$/i));
      console.log("✅ Vídeos válidos após filtro:", validVideos.length);
      
      const currentTotal = (existingVideoUrls?.length || 0) + (videos?.length || 0);
      const remainingSlots = 10 - currentTotal;
      
      if (files.length > remainingSlots) {
        alert("Você só pode selecionar até 10 clipes no total. Selecione apenas 10 vídeos e tente de novo.");
        e.target.value = "";
        return;
      }

      const limitedVideos = validVideos;

      const newPreviews = limitedVideos.map(f => {
          try {
              return URL.createObjectURL(f);
          } catch (err) {
              console.error("❌ Erro ao criar preview para:", f.name, err);
              return "";
          }
      }).filter(Boolean);
      
      setVideos(prev => [...prev, ...limitedVideos]);
      setVideoPreviews(prev => [...prev, ...newPreviews]);
    } catch (err) {
      console.error("❌ Erro crítico no handleVideosChange:", err);
    } finally {
      setProcessingVideos(false);
    }
  }

  function removeVideo(index: number) {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
  }

  function removeExistingVideo(index: number) {
    setExistingVideoUrls(prev => prev.filter((_, i) => i !== index));
  }

  function removeExistingMusic() {
    setExistingMusicUrl("");
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
        console.log("🏠 Dados do Imóvel carregados:", p);

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
        
        // Carrega mídias de Reels - Mapeando para strings para evitar erro de [object Object]
        setExistingVideoUrls(p.videos?.map((v: any) => v.videoUrl) || []);
        setExistingMusicUrl(p.reelsMusicUrl || p.reels_music_url || "");

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

    if (existingImages.length + newImages.length === 0 && existingVideoUrls.length + videos.length === 0) {
      setError("Mantenha pelo menos uma mídia (foto ou vídeo) no anúncio.");
      return;
    }

    async function uploadImagesAndGetUrls() {
        const uploadedUrls: string[] = [];
        setUploadingImages(true);
        try {
          // Convert base64 newImages back to Files for upload or use existing API
          // Actually, the existing API app/api/upload-image expects a File.
          // Since newImages are base64, we need to convert them.
          for (const base64 of newImages) {
            const res = await fetch(base64);
            const blob = await res.blob();
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
            
            const formData = new FormData();
            formData.append("file", file);
            const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
            const data = await uploadRes.json();
            if (data.success) uploadedUrls.push(data.imageUrl);
          }
          return uploadedUrls;
        } finally {
          setUploadingImages(false);
        }
    }

    try {
      setSaving(true);
      setUploadProgress(5);
      setStatusMessage("Preparando arquivos...");

      // Contagem total para o progresso
      const totalSteps = newImages.length + (reelsMusic ? 1 : 0) + videos.length + 1; // +1 para o salvamento final
      let currentStep = 0;

      const updateProgress = (msg: string) => {
        currentStep++;
        const pct = Math.round((currentStep / totalSteps) * 90) + 5;
        setUploadProgress(pct);
        setStatusMessage(msg);
      };

      // 1. Upload de Imagens
      const uploadedNewImageUrls: string[] = [];
      if (newImages.length > 0) {
          for (const item of newImages) {
            updateProgress(`Enviando fotos (${uploadedNewImageUrls.length + 1}/${newImages.length})...`);
            
            const formData = new FormData();
            formData.append("file", item.file);
            const uploadRes = await fetch("/api/upload-image", { method: "POST", body: formData });
            const data = await uploadRes.json();
            if (data.success) {
              uploadedNewImageUrls.push(data.imageUrl);
            } else {
              throw new Error(`Falha ao enviar foto: ${data.error}`);
            }
          }
      }
      
      // 2. Upload de Música do Reel
      let uploadedMusicUrl = existingMusicUrl;
      if (reelsMusic) {
          updateProgress("Enviando trilha sonora...");
          const formData = new FormData();
          formData.append("file", reelsMusic);
          const res = await fetch("/api/upload-image", { method: "POST", body: formData });
          const data = await res.json();
          
          if (data.success) {
              uploadedMusicUrl = data.imageUrl;
          } else {
              throw new Error("Falha ao enviar a música: " + data.error);
          }
      }

      // 3. Upload de Vídeos
      const uploadedVideoUrls: string[] = [...existingVideoUrls];
      if (videos.length > 0) {
          let vCount = 0;
          for (const file of videos) {
              vCount++;
              updateProgress(`Enviando vídeos (${vCount}/${videos.length})...`);
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/upload-image", { method: "POST", body: formData });
              const data = await res.json();
              if (data.success) {
                uploadedVideoUrls.push(data.imageUrl);
              } else {
                throw new Error(`Falha ao enviar vídeo: ${data.error}`);
              }
          }
      }

      // Garantir que números sejam válidos
      const safePrice = Number(String(price).replace(/\./g, "").replace(",", "."));
      const safeLat = Number(latitude);
      const safeLon = Number(longitude);

      if (isNaN(safePrice)) throw new Error("Preço inválido. Use apenas números.");
      if (isNaN(safeLat) || isNaN(safeLon)) throw new Error("Coordenadas geográficas inválidas.");

      const payload = {
        category,
        property_type: propertyType,
        title,
        description,
        price: safePrice,
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
        google_maps_link: buildGoogleMapsLinkFromCoords(safeLat, safeLon),
        google_maps_thumbnail: buildGoogleMapsThumbnail(safeLat, safeLon),
        youtube_link: youtubeLink,
        youtube_thumbnail: buildYoutubeThumbnail(youtubeLink),
        topography_points: topographyPoints.filter(Boolean).join(","),
        latitude: safeLat,
        longitude: safeLon,
        images: [...existingImages.map((img) => img.imageUrl), ...uploadedNewImageUrls],
        videos: uploadedVideoUrls,
        reels_music_url: uploadedMusicUrl,
      };

      updateProgress("Finalizando salvamento...");
      console.log("📤 Payload preparado:", payload);

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

      setUploadProgress(100);
      setMessage("Anúncio atualizado com sucesso.");
      setTimeout(() => {
        router.push("/minha-conta/anuncios");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar anúncio.");
      setSaving(false);
      setUploadProgress(0);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-2 border-sky-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full border-b-2 border-white/20 animate-spin-slow"></div>
          </div>
          <p className="mt-8 text-center text-sm font-medium tracking-widest text-slate-500 uppercase">RealStock</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white relative">
      {/* OVERLAY DE PROGRESSO AO SALVAR */}
      {saving && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm">
          <div className="w-full max-w-md px-8 text-center">
            <div className="mb-8 relative mx-auto h-24 w-24">
               <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
               <div 
                 className="absolute inset-0 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"
                 style={{ animationDuration: '1.5s' }}
               ></div>
               <div className="absolute inset-0 flex items-center justify-center font-black text-xl text-white">
                  {uploadProgress}%
               </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Atualizando Anúncio</h2>
            <p className="text-slate-400 text-sm mb-8 animate-pulse">{statusMessage}</p>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-sky-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                 style={{ width: `${uploadProgress}%` }}
               ></div>
            </div>
          </div>
        </div>
      )}
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
          className="space-y-4"
        >
          <div className="grid gap-4 lg:grid-cols-[320px_1fr_420px]">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-slate-400 to-slate-600 text-white shadow-lg">
                 <LayoutGrid size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">1. Categoria</h3>
                 <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Base do Anúncio</p>
              </div>
            </div>

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
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 space-y-6">
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
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/20">
                     <Video size={24} />
                  </div>
                  <div>
                     <h3 className="text-xl font-black text-white tracking-tighter uppercase italic leading-tight">5. Vídeo YouTube</h3>
                     <p className="text-[9px] text-red-400 font-black uppercase tracking-widest">Exposição Audiovisual</p>
                  </div>
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
                <iframe src={googleMapsThumbnail} className="h-40 w-full" loading="lazy" />
              </div>
            )}
           </div>
        </div>

        {/* SEÇÃO DE FOTOS DO IMÓVEL - PREMIUM LAYOUT */}
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
                    <Field label="Upload de Novas Fotos">
                       <input
                         type="file"
                         accept="image/*"
                         multiple
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
                             <strong className="text-slate-200">Organização Inteligente:</strong> Arraste as fotos para mudar a ordem. A primeira foto será a miniatura principal do anúncio na vitrine.
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    {existingImages.length > 0 && (
                       <div className="space-y-3">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fotos Ativas no Servidor:</div>
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndExistingImages}>
                             <SortableContext items={existingImages.map(img => img.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   {existingImages.map((image) => (
                                      <SortableItem key={image.id} id={image.id}>
                                         <div className="overflow-hidden rounded-xl border border-sky-500/30 bg-sky-500/5">
                                            <img 
                                               src={image.imageUrl} 
                                               alt="" 
                                               className="h-24 w-full object-cover" 
                                               onError={(e) => {
                                                  console.warn("Imagem ausente no servidor:", image.imageUrl);
                                                  e.currentTarget.src = "https://placehold.co/400x400/1e293b/475569?text=Falha+na+M%C3%ADdia";
                                               }}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeExistingImage(image.id)}
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

                    {newImages.length > 0 && (
                       <div className="space-y-3 pt-4 border-t border-white/5">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Novas Fotos (Upload):</div>
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndNewImages}>
                             <SortableContext items={newImages.map(img => img.id)} strategy={rectSortingStrategy}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                   {newImages.map((img, index) => (
                                      <SortableItem key={img.id} id={img.id}>
                                         <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                                            <img src={img.preview} alt="" className="h-24 w-full object-cover" />
                                            <button
                                              type="button"
                                              onClick={() => removeNewImage(index)}
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

        {/* SEÇÃO DE REELS - PREMIUM REDESIGN */}
        <div className="w-full relative group overflow-hidden rounded-[32px] border border-purple-500/30 bg-slate-900/50 p-6 md:p-8 shadow-2xl transition-all hover:border-purple-500/50">
                {/* Background Glow */}
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
                      {/* LADO ESQUERDO: VÍDEOS */}
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
                              id="reels-videos-input"
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
                            <div className={`text-xs font-black italic ${videos.length + existingVideoUrls.length >= 10 ? 'text-purple-400' : 'text-sky-400'}`}>
                               {processingVideos ? "⏳ PROCESSANDO..." : `${videos.length + existingVideoUrls.length}/10 CLIPES`}
                            </div>
                         </div>

                         {/* VÍDEOS EXISTENTES E NOVOS */}
                          <div className="space-y-4">
                             {(existingVideoUrls.length > 0 || videoPreviews.length > 0) && (
                                <div className="space-y-6">
                                   {existingVideoUrls.length > 0 && (
                                      <div>
                                         <div className="mb-2 text-[10px] font-bold text-slate-500 uppercase">Vídeos Ativos:</div>
                                         <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndVideos}>
                                            <SortableContext items={existingVideoUrls} strategy={rectSortingStrategy}>
                                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                  {existingVideoUrls.map((url, index) => (
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
                                         <div className="mb-2 text-[10px] font-bold text-slate-500 uppercase">Novos Clipes:</div>
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

                      {/* LADO DIREITO: MÚSICA */}
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
                              className="flex items-center gap-4 p-6 rounded-3xl border border-white/10 bg-slate-950/50 hover:bg-slate-900 hover:border-indigo-500/50 cursor-pointer transition-all group/music"
                            >
                               <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400 group-hover/music:text-indigo-400 transition-all">
                                  <Music size={24} />
                               </div>
                               <div>
                                  <div className="text-xs font-bold text-white uppercase tracking-widest mb-1">Selecionar Trilha</div>
                                  <div className="text-[10px] text-slate-500 uppercase italic">MP3 ou WAV recomendado</div>
                               </div>
                            </label>
                         </div>

                         {/* PREVIEW DA MÚSICA */}
                         {(existingMusicUrl || reelsMusicPreview) && (
                            <div className="p-6 rounded-[24px] bg-slate-950/80 border border-white/5 shadow-inner">
                               <div className="flex items-center justify-between mb-4">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monitoramento de Áudio</span>
                                  <button 
                                    type="button"
                                    onClick={existingMusicUrl ? removeExistingMusic : () => { setReelsMusic(null); setReelsMusicPreview(""); }}
                                    className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase italic"
                                  >
                                    Descartar
                                  </button>
                               </div>
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 animate-bounce">
                                     <Music size={20} />
                                  </div>
                                  <audio 
                                    src={existingMusicUrl || reelsMusicPreview} 
                                    controls 
                                    className="w-full h-8 brightness-110 filter hue-rotate-15" 
                                  />
                               </div>
                            </div>
                         )}

                         <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                            <div className="flex items-start gap-3">
                               <div className="mt-1 h-5 w-5 flex-shrink-0 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
                                  <span className="text-[10px] font-bold">i</span>
                               </div>
                               <p className="text-[10px] leading-relaxed text-slate-400 font-medium">
                                  <strong className="text-slate-200">Dica Estratégica:</strong> Selecione até 10 clipes. O sistema usará o miolo de 5 segundos de cada um para criar um Reels dinâmico e sincronizado com a música.
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
            </div>

            <div className="lg:col-span-3 pt-8 space-y-4">
              <button
                type="submit"
                disabled={saving || uploadingImages}
                className="w-full group relative overflow-hidden rounded-[24px] bg-white px-8 py-8 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-2xl shadow-white/10"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/10 to-purple-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative z-10 flex items-center justify-center gap-3 text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
                   {saving || uploadingImages ? "Processando..." : "Salvar Alterações e Publicar"}
                   <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4 font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-60 mt-3"
            >
               Excluir anúncio
            </button>
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
export default function EditarAnuncioPage() {
  return (
    <Suspense fallback={<LoadingScreen title="Carregando" subtitle="Preparando ambiente de edição..." />}>
      <EditarAnuncioContent />
    </Suspense>
  );
}
