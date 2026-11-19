"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  X, Play, Pause, Download, Film, Loader2, Sparkles, Wand2, 
  CheckCircle2, Rocket, Music, Volume2, VolumeX, Sliders, 
  Layers, Clock, ChevronRight, ChevronDown, Check, RefreshCw,
  Upload, Video as VideoIcon
} from "lucide-react";
import { uploadFileWithProgress } from "@/lib/upload-client";
import { 
  renderReelsFrame, 
  LoadedMediaItem, 
  TransitionType, 
  PacingDuration, 
  ReelsScriptConfig, 
  ReelsRenderOptions 
} from "@/lib/reels-engine";

interface VideoCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyCity?: string | null;
  propertyState?: string | null;
  listingType?: string | null;
  price?: number | null;
  neighborhood?: string | null;
  images: { imageUrl: string; title?: string; city?: string; state?: string }[];
  videos?: { videoUrl: string }[];
  reelsMusicUrl?: string | null;
  propertyId: number;
  onSuccess?: (videoUrl: string) => void;
}

const TRANSITIONS_LIST: { id: TransitionType; label: string; icon: string; desc: string }[] = [
  { id: "smart_mix", label: "Smart Mix IA", icon: "⚡", desc: "Alterna os melhores efeitos a cada cena" },
  { id: "zoom_punch", label: "Zoom Punch", icon: "💥", desc: "Aceleração 3D estilo CapCut" },
  { id: "whip_pan", label: "Whip Pan", icon: "💨", desc: "Deslize dinâmico com desfoque de movimento" },
  { id: "flash", label: "Flash Cinema", icon: "✨", desc: "Transição suave por explosão de luz" },
  { id: "crossfade", label: "Crossfade", icon: "🌊", desc: "Fusão clássica e elegante de ambientes" },
  { id: "blur_dissolve", label: "Blur Dissolve", icon: "🌫️", desc: "Desfoque suave de cinema" },
];

const PACING_OPTIONS: { duration: PacingDuration; label: string; desc: string; badge: string }[] = [
  { duration: 15, label: "15 segundos", desc: "Ultra dinâmico para Stories e TikTok", badge: "Viral" },
  { duration: 30, label: "30 segundos", desc: "Ritmo ideal recomendado para Reels", badge: "Recomendado" },
  { duration: 59, label: "60 segundos", desc: "Tour completo e imersivo", badge: "Completo" },
];

export default function VideoCreatorModal({
  isOpen,
  onClose,
  propertyTitle,
  propertyCity,
  propertyState,
  listingType,
  price,
  neighborhood,
  images,
  videos = [],
  reelsMusicUrl,
  propertyId,
  onSuccess,
}: VideoCreatorModalProps) {
  const isSeasonal = listingType === "ALUGUEL_TEMPORADA";

  // Estados principais
  const [step, setStep] = useState<"preview" | "generating" | "result">("preview");
  const [mode, setMode] = useState<"ai_studio" | "upload_custom">("ai_studio");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string | null>(null);
  const [isCustomUploading, setIsCustomUploading] = useState(false);
  const [customUploadProgress, setCustomUploadProgress] = useState(0);

  const [activeTab, setActiveTab] = useState<"ai_script" | "effects" | "audio">("ai_script");
  const [progress, setProgress] = useState(0);
  const [generatingMessage, setGeneratingMessage] = useState("Preparando mídias...");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isIncorporateLoading, setIsIncorporateLoading] = useState(false);
  const [incorporateProgress, setIncorporateProgress] = useState(0);
  const [isPaid, setIsPaid] = useState(false);

  // Configurações do Reels Engine
  const [selectedDuration, setSelectedDuration] = useState<PacingDuration>(30);
  const [selectedTransition, setSelectedTransition] = useState<TransitionType>("smart_mix");
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [showPriceBadge, setShowPriceBadge] = useState(true);
  const [showCaptions, setShowCaptions] = useState(true);

  // Áudio
  const [includeMusic, setIncludeMusic] = useState(true);
  const [isPlayingPreviewAudio, setIsPlayingPreviewAudio] = useState(false);

  // Roteiro IA
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [scriptConfig, setScriptConfig] = useState<ReelsScriptConfig>({
    hook: isSeasonal 
      ? `Procurando o refúgio perfeito para suas férias em ${propertyCity || "um paraíso"}? 🌴`
      : `Conheça este imóvel exclusivo à venda em ${propertyCity || "localização privilegiada"}! ✨`,
    subtitle: `${propertyCity ? `${propertyCity} • ` : ""}${isSeasonal ? "ALUGUEL POR TEMPORADA" : "IMÓVEL À VENDA"}`,
    priceTag: price 
      ? (isSeasonal ? `R$ ${price.toLocaleString("pt-BR")}/diária` : `R$ ${price.toLocaleString("pt-BR")}`)
      : (isSeasonal ? "Consulte diária" : "Consulte valor"),
    featureBadge: isSeasonal ? "Temporada Exclusiva • Lazer Completo" : "Alto Padrão • Oportunidade Única",
    scenes: [
      { headline: isSeasonal ? "Seu Refúgio Perfeito" : "Design & Sofisticação", sub: "Ambientes amplos e confortáveis" },
      { headline: isSeasonal ? "Momentos Inesquecíveis" : "Living Integrado", sub: "Iluminação natural e elegância" },
      { headline: isSeasonal ? "Lazer & Descanso" : "Suíte Master", sub: "Conforto absoluto para você" },
      { headline: isSeasonal ? "Localização Privilegiada" : "Alta Valorização", sub: "Pronto para receber sua proposta" },
    ],
    cta: isSeasonal 
      ? "Reserve suas datas direto na RealStock! 📲"
      : "Envie sua proposta direto na RealStock! 📲",
  });
  const [isScriptAccordionOpen, setIsScriptAccordionOpen] = useState(false);

  // Refs para reprodução / canvas
  // Refs para reprodução / canvas unificado
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const previewAnimFrameRef = useRef<number | null>(null);

  // Estado da prévia interativa no canvas
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);
  const loadedMediaCacheRef = useRef<LoadedMediaItem[]>([]);
  const isMediaLoadingRef = useRef(false);

  // Carrega e armazena mídias em cache (em paralelo e com garantia de pelo menos 4 cenas)
  const loadMediaItems = useCallback(async (): Promise<LoadedMediaItem[]> => {
    if (loadedMediaCacheRef.current.length > 0) {
      return loadedMediaCacheRef.current;
    }
    if (isMediaLoadingRef.current) {
      while (isMediaLoadingRef.current) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return loadedMediaCacheRef.current;
    }

    isMediaLoadingRef.current = true;
    const items: LoadedMediaItem[] = [];

    // Carregar Vídeos em paralelo se houver
    if (videos && videos.length > 0) {
      const videoPromises = videos.slice(0, 3).map(async (v) => {
        return new Promise<LoadedMediaItem | null>((resolve) => {
          try {
            const vid = document.createElement("video");
            vid.src = v.videoUrl;
            vid.crossOrigin = "anonymous";
            vid.muted = true;
            vid.playsInline = true;
            let finished = false;
            const done = () => {
              if (finished) return;
              finished = true;
              if (vid.videoWidth > 0) {
                resolve({
                  type: "video",
                  element: vid,
                  width: vid.videoWidth,
                  height: vid.videoHeight,
                  duration: vid.duration || 5,
                });
              } else {
                resolve(null);
              }
            };
            vid.onloadeddata = done;
            vid.onerror = () => {
              if (!finished) {
                finished = true;
                resolve(null);
              }
            };
            setTimeout(done, 4000);
          } catch {
            resolve(null);
          }
        });
      });
      const loadedVideos = await Promise.all(videoPromises);
      for (const v of loadedVideos) {
        if (v) items.push(v);
      }
    }

    // Carregar Imagens em PARALELO
    const candidateImages = images && images.length > 0 ? images.slice(0, 15) : [];
    if (candidateImages.length > 0) {
      const imagePromises = candidateImages.map((img) => {
        return new Promise<LoadedMediaItem | null>((resolve) => {
          try {
            const imageEl = new Image();
            imageEl.crossOrigin = "anonymous";
            imageEl.src = img.imageUrl;
            let finished = false;
            const done = () => {
              if (finished) return;
              finished = true;
              if (imageEl.naturalWidth > 0) {
                resolve({
                  type: "image",
                  element: imageEl,
                  width: imageEl.naturalWidth,
                  height: imageEl.naturalHeight,
                });
              } else {
                resolve(null);
              }
            };
            imageEl.onload = done;
            imageEl.onerror = () => {
              if (!finished) {
                finished = true;
                resolve(null);
              }
            };
            setTimeout(done, 5000);
          } catch {
            resolve(null);
          }
        });
      });

      const loadedImages = await Promise.all(imagePromises);
      for (const img of loadedImages) {
        if (img) items.push(img);
      }
    }

    // Garantir que temos pelo menos 4 cenas no Reel para todos os movimentos e legendas
    if (items.length > 0 && items.length < 4) {
      const initialItems = [...items];
      while (items.length < 4) {
        items.push(...initialItems);
      }
    }

    loadedMediaCacheRef.current = items;
    isMediaLoadingRef.current = false;
    setIsMediaLoaded(items.length > 0);
    return items;
  }, [images, videos]);

  // Busca inicial do Roteiro IA
  const fetchAiScript = useCallback(async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/ai-reels-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageCount: Math.max(4, Math.min(10, images.length || 6)) }),
      });
      const data = await res.json();
      if (data.success && data.script) {
        setScriptConfig(data.script);
      }
    } catch (err) {
      console.error("Erro ao gerar roteiro IA:", err);
    } finally {
      setIsAiLoading(false);
    }
  }, [propertyId, images.length]);

  useEffect(() => {
    if (isOpen) {
      loadMediaItems();
      fetchAiScript();
    } else {
      setStep("preview");
      setVideoUrl(null);
      setVideoBlob(null);
      setIsPaid(false);
      setProgress(0);
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.currentTime = 0;
      }
      setIsPlayingPreviewAudio(false);
      if (previewAnimFrameRef.current) {
        cancelAnimationFrame(previewAnimFrameRef.current);
      }
    }
  }, [isOpen, fetchAiScript, loadMediaItems]);

  // Loop de animação da Prévia Interativa no Canvas (síncrono e ultra fluído)
  useEffect(() => {
    if (!isOpen || step !== "preview") return;

    let isMounted = true;
    let lastTimestamp = performance.now();
    let currentT = 0;

    const renderLoop = (now: number) => {
      if (!isMounted) return;

      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (isPreviewPlaying) {
        currentT = (currentT + Math.min(delta, 0.1)) % selectedDuration;
        setPreviewTime(currentT);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const media = loadedMediaCacheRef.current;
        if (ctx && media.length > 0) {
          try {
            renderReelsFrame(
              ctx,
              media,
              canvas.width,
              canvas.height,
              currentT,
              selectedDuration,
              {
                transitionType: selectedTransition,
                listingType,
                script: scriptConfig,
                showProgressBar,
                showPriceBadge,
                showCaptions,
              }
            );
          } catch (e) {
            console.warn("Erro no renderLoop da prévia:", e);
          }
        }
      }

      previewAnimFrameRef.current = requestAnimationFrame(renderLoop);
    };

    previewAnimFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isMounted = false;
      if (previewAnimFrameRef.current) {
        cancelAnimationFrame(previewAnimFrameRef.current);
      }
    };
  }, [
    isOpen,
    step,
    isPreviewPlaying,
    selectedDuration,
    selectedTransition,
    listingType,
    scriptConfig,
    showProgressBar,
    showPriceBadge,
    showCaptions,
  ]);

  // Controle de Áudio Prévia
  const toggleAudioPreview = async () => {
    try {
      if (isPlayingPreviewAudio) {
        audioPreviewRef.current?.pause();
        setIsPlayingPreviewAudio(false);
      } else {
        const trackUrl = reelsMusicUrl || "/music/trend-hype.mp3";
        if (!audioPreviewRef.current) {
          audioPreviewRef.current = new Audio(trackUrl);
          audioPreviewRef.current.crossOrigin = "anonymous";
          audioPreviewRef.current.loop = true;
        }
        await audioPreviewRef.current.play();
        setIsPlayingPreviewAudio(true);
        setIncludeMusic(true);
      }
    } catch (err) {
      console.warn("Reprodução de áudio bloqueada:", err);
      setIsPlayingPreviewAudio(false);
    }
  };

  // UPLOAD E SALVAMENTO DE VÍDEO PRÓPRIO (ATÉ 60S)
  const handleSaveCustomVideo = async () => {
    if (!customFile) {
      alert("Por favor, selecione um arquivo de vídeo primeiro.");
      return;
    }
    try {
      setIsCustomUploading(true);
      setCustomUploadProgress(5);

      // 1. Upload direto ao Supabase Storage contornando limites da Vercel
      const publicUrl = await uploadFileWithProgress(customFile, (pct) => {
        setCustomUploadProgress(pct);
      });

      // 2. Vincular ao imóvel no banco de dados
      const cleanPath = publicUrl.includes("/property-images/")
        ? publicUrl.split("/property-images/")[1]
        : publicUrl;

      const compRes = await fetch("/api/minha-conta/video-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          propertyId,
          filePath: cleanPath,
          orderID: "FREE",
          isCustomVideo: true,
        }),
      });

      const compData = await compRes.json();
      if (!compData.success) {
        throw new Error(compData.error || "Erro ao vincular vídeo ao anúncio.");
      }

      setCustomUploadProgress(100);
      setIsPaid(true);
      if (onSuccess) onSuccess(publicUrl);
      alert("Sucesso! Seu vídeo próprio foi enviado e incorporado ao anúncio com sucesso.");
      onClose();
    } catch (err: any) {
      alert("Erro ao enviar vídeo próprio: " + err.message);
    } finally {
      setIsCustomUploading(false);
      setCustomUploadProgress(0);
    }
  };

  // GERAÇÃO COMPLETA DO VÍDEO
  const handleGenerateVideo = async () => {
    if (previewAnimFrameRef.current) {
      cancelAnimationFrame(previewAnimFrameRef.current);
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      setIsPlayingPreviewAudio(false);
    }

    setStep("generating");
    setProgress(0);
    setGeneratingMessage("Inicializando motor de renderização...");
    chunksRef.current = [];

    const canvas = canvasRef.current;
    if (!canvas) {
      alert("Elemento de renderização não encontrado.");
      setStep("preview");
      return;
    }

    const width = 720;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    setGeneratingMessage("Carregando mídias em alta resolução...");
    const mediaItems = await loadMediaItems();
    if (mediaItems.length === 0) {
      alert("Não foi possível carregar as fotos ou vídeos do anúncio.");
      setStep("preview");
      return;
    }

    const fps = 30;
    const totalFrames = selectedDuration * fps;
    const stream = canvas.captureStream(fps);
    let finalStream = stream;
    const vTrack = stream.getVideoTracks()[0] as any;

    // Configura áudio se habilitado
    if (includeMusic) {
      try {
        setGeneratingMessage("Sincronizando trilha sonora...");
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioContextRef.current.state === "suspended") {
          await audioContextRef.current.resume();
        }

        const trackUrl = reelsMusicUrl || "/music/trend-hype.mp3";
        const audio = new Audio(trackUrl);
        audio.crossOrigin = "anonymous";
        audio.loop = true;
        recordingAudioRef.current = audio;

        await new Promise((resolve) => {
          audio.oncanplaythrough = resolve;
          audio.onloadedmetadata = resolve;
          setTimeout(resolve, 3000);
        });

        const source = audioContextRef.current.createMediaElementSource(audio);
        const destination = audioContextRef.current.createMediaStreamDestination();
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(destination);

        const aTracks = destination.stream.getAudioTracks();
        if (aTracks.length > 0) {
          finalStream = new MediaStream([...stream.getVideoTracks(), aTracks[0]]);
        }
        await audio.play().catch(() => {});
      } catch (err) {
        console.warn("Aviso ao configurar áudio da gravação:", err);
      }
    }

    const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
      ? "video/mp4;codecs=avc1"
      : MediaRecorder.isTypeSupported("video/mp4")
      ? "video/mp4"
      : "video/webm";

    const recorder = new MediaRecorder(finalStream, {
      mimeType,
      videoBitsPerSecond: 1600000, // 1.6 Mbps otimizado para 720p/1080p vertical
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    let stopFired = false;
    recorder.onstop = () => {
      if (stopFired) return;
      stopFired = true;

      if (recordingAudioRef.current) {
        try {
          recordingAudioRef.current.pause();
          recordingAudioRef.current.currentTime = 0;
          recordingAudioRef.current = null;
        } catch (e) {}
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
          audioContextRef.current = null;
        } catch (e) {}
      }

      const cleanMimeType = mimeType.split(";")[0];
      const blob = new Blob(chunksRef.current, { type: cleanMimeType });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      setStep("result");
      setProgress(100);
    };

    // Renderiza quadro 0 e inicia gravação
    renderReelsFrame(ctx, mediaItems, width, height, 0, selectedDuration, {
      transitionType: selectedTransition,
      listingType,
      script: scriptConfig,
      showProgressBar,
      showPriceBadge,
      showCaptions,
    });
    if (vTrack && typeof vTrack.requestFrame === "function") {
      try { vTrack.requestFrame(); } catch (_) {}
    }

    recorder.start(200);
    await new Promise((r) => setTimeout(r, 200));

    setGeneratingMessage("Renderizando cenas e transições em alta definição...");

    for (let frame = 0; frame < totalFrames; frame++) {
      const frameStartTime = performance.now();
      const currentTime = (frame / totalFrames) * selectedDuration;

      // Atualiza progresso da UI periodicamente para não travar a thread principal
      if (frame % 6 === 0 || frame === totalFrames - 1) {
        setProgress(Math.min(95, Math.round((frame / totalFrames) * 95)));
      }

      try {
        renderReelsFrame(ctx, mediaItems, width, height, currentTime, selectedDuration, {
          transitionType: selectedTransition,
          listingType,
          script: scriptConfig,
          showProgressBar,
          showPriceBadge,
          showCaptions,
        });
      } catch (renderErr) {
        console.warn("Aviso no quadro de renderização:", renderErr);
      }

      // Forçar Safari / WebKit no iOS a registrar o frame na stream
      if (vTrack && typeof vTrack.requestFrame === "function") {
        try { vTrack.requestFrame(); } catch (_) {}
      }

      const elapsed = performance.now() - frameStartTime;
      const sleepTime = Math.max(12, 1000 / fps - elapsed);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }

    setGeneratingMessage("Finalizando e codificando arquivo...");
    setProgress(98);
    await new Promise((r) => setTimeout(r, 800));

    if (recorder.state === "recording") {
      recorder.stop();
    }
    finalStream.getTracks().forEach((t) => t.stop());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-[32px] border border-white/20 bg-slate-950 shadow-2xl overflow-hidden my-6">
        
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white/70 hover:text-white transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr]">
          
          {/* Lado Esquerdo: Canvas Preview 9:16 */}
          <div className="relative flex flex-col items-center justify-center bg-slate-900/80 p-6 border-b lg:border-b-0 lg:border-r border-white/10">
            <div className="relative aspect-[9/16] w-full max-w-[280px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black">
              {/* Canvas único, sempre visível durante preview e gravação para garantir captura perfeita no Safari/iOS */}
              <canvas
                ref={canvasRef}
                width={720}
                height={1280}
                className={`h-full w-full object-cover ${step === "result" || mode === "upload_custom" ? "hidden" : "block"}`}
              />

              {/* Prévia de Vídeo Próprio Selecionado */}
              {mode === "upload_custom" && customPreviewUrl && (
                <video
                  src={customPreviewUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover bg-black"
                />
              )}

              {/* Placeholder quando nenhum vídeo próprio foi selecionado */}
              {mode === "upload_custom" && !customPreviewUrl && (
                <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                  <div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 border border-purple-500/20">
                    <VideoIcon size={28} />
                  </div>
                  <span className="text-xs font-bold text-white mb-1">Prévia do Vídeo Próprio</span>
                  <span className="text-[10px] text-slate-400">Selecione um arquivo de até 60s ao lado para visualizar</span>
                </div>
              )}

              {/* Controles Flutuantes da Prévia IA */}
              {mode === "ai_studio" && step === "preview" && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                    className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-sky-400 transition"
                  >
                    {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} />}
                    <span>{Math.round(previewTime)}s / {selectedDuration}s</span>
                  </button>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">
                    Prévia Ao Vivo
                  </span>
                </div>
              )}

              {/* Overlay HUD durante gravação em tempo real (visível sobre o canvas gravado) */}
              {mode === "ai_studio" && step === "generating" && (
                <div className="absolute inset-0 flex flex-col items-center justify-between p-5 bg-black/35 backdrop-blur-[2px] pointer-events-none">
                  <div className="w-full flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-950/80 border border-red-500/40 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span> REC HD
                    </span>
                    <span className="text-xs font-black text-white bg-black/60 px-2.5 py-1 rounded-full border border-white/10">
                      {progress}%
                    </span>
                  </div>

                  <div className="flex flex-col items-center text-center bg-black/85 rounded-2xl p-4 border border-white/15 shadow-2xl backdrop-blur-md max-w-[240px]">
                    <Loader2 className="h-7 w-7 animate-spin text-sky-400 mb-2" />
                    <h4 className="text-xs font-bold text-white">Gravando Reels HD</h4>
                    <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">{generatingMessage}</p>
                    <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sky-400 to-indigo-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-white/70 bg-black/50 px-2.5 py-0.5 rounded-full font-mono">
                    720x1280 • 30 FPS
                  </div>
                </div>
              )}

              {/* Resultado final: Vídeo gravado */}
              {mode === "ai_studio" && step === "result" && videoUrl && (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover bg-black"
                />
              )}
            </div>
          </div>

          {/* Lado Direito: Estúdio de Controle IA */}
          <div className="flex flex-col justify-between p-6 sm:p-8 overflow-y-auto max-h-[85vh]">
            <div>
              {/* Header com identificação da modalidade */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 items-center gap-1 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 px-3 text-[11px] font-bold text-purple-300">
                    <Sparkles size={12} className="text-purple-400" /> Reels Studio IA
                  </span>
                  <span className={`flex h-7 items-center rounded-full px-3 text-[11px] font-bold border ${
                    isSeasonal 
                      ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                      : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  }`}>
                    {isSeasonal ? "🌴 Aluguel por Temporada" : "🏡 Imóvel à Venda"}
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-mono">9:16 Vertical HD</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">Criador de Reels Profissional</h2>
              <p className="mt-1 text-slate-400 text-xs sm:text-sm">
                {isSeasonal
                  ? "Vídeos cinematográficos para atrair reservas imediatas de temporada com transições e legendas inteligentes."
                  : "Vídeos de alto impacto para atrair compradores qualificados e propostas de compra no Instagram e TikTok."}
              </p>

              {/* Seletor de Modo: IA Studio vs Vídeo Próprio */}
              <div className="mt-5 flex flex-wrap items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit">
                <button
                  type="button"
                  onClick={() => setMode("ai_studio")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    mode === "ai_studio"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles size={14} />
                  Criar com IA (Fotos)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("upload_custom")}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    mode === "upload_custom"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Upload size={14} />
                  Upload Vídeo Próprio (até 60s)
                </button>
              </div>

              {mode === "upload_custom" ? (
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Vídeo Pronto Gravado ou Editado
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Envie o vídeo pronto de até 60 segundos gravado pelo celular ou editado no CapCut/Instagram. O envio é feito diretamente sem limite de tamanho da Vercel.
                    </p>

                    <div className="relative">
                      <input
                        id="modal-custom-video-file"
                        type="file"
                        accept="video/*,video/mp4,video/quicktime,.mov,.mp4,.webm"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          if (file) {
                            setCustomFile(file);
                            setCustomPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="modal-custom-video-file"
                        className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/60 cursor-pointer transition-all group"
                      >
                        <div className="h-12 w-12 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                          <Upload size={24} />
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold text-white uppercase tracking-widest mb-1">
                            {customFile ? customFile.name : "Selecionar Vídeo do Celular / Computador"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {customFile
                              ? `${(customFile.size / (1024 * 1024)).toFixed(1)} MB • Pronto para envio`
                              : "MP4 ou MOV • Até 60 segundos • Até 200 MB"}
                          </div>
                        </div>
                      </label>
                    </div>

                    {customFile && (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                        <div className="flex items-center gap-2 text-slate-300 min-w-0">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <span className="font-medium truncate">{customFile.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomFile(null);
                            setCustomPreviewUrl(null);
                          }}
                          className="text-red-400 hover:text-red-300 text-[11px] font-bold shrink-0 ml-2"
                        >
                          Trocar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Botão Mágico Roteiro IA */}
                  <div className="mt-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                      <Wand2 size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        Roteiro & Ganchos de IA
                        <span className="text-[10px] bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                          {isSeasonal ? "Temporada" : "Venda"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Legendas persuasivas adaptadas para cada cena do anúncio.
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={fetchAiScript}
                    disabled={isAiLoading}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
                  >
                    {isAiLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        Regerar com IA
                      </>
                    )}
                  </button>
                </div>

                {/* Editor Expansível de Legendas */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => setIsScriptAccordionOpen(!isScriptAccordionOpen)}
                    className="flex items-center justify-between w-full text-xs font-bold text-slate-300 hover:text-white transition"
                  >
                    <span>Editar títulos e legendas cena a cena ({scriptConfig.scenes.length} cenas)</span>
                    {isScriptAccordionOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {isScriptAccordionOpen && (
                    <div className="mt-3 space-y-3 max-h-48 overflow-y-auto pr-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Gancho de Entrada (Hook)</label>
                        <input
                          type="text"
                          value={scriptConfig.hook}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, hook: e.target.value })}
                          className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Tag de Preço</label>
                          <input
                            type="text"
                            value={scriptConfig.priceTag}
                            onChange={(e) => setScriptConfig({ ...scriptConfig, priceTag: e.target.value })}
                            className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-slate-400">Destaques Rápidos</label>
                          <input
                            type="text"
                            value={scriptConfig.featureBadge}
                            onChange={(e) => setScriptConfig({ ...scriptConfig, featureBadge: e.target.value })}
                            className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      {scriptConfig.scenes.map((sc, i) => (
                        <div key={i} className="flex gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/5">
                          <span className="text-[10px] font-mono text-purple-400 w-5 text-center font-bold">#{i + 1}</span>
                          <input
                            type="text"
                            placeholder="Título"
                            value={sc.headline}
                            onChange={(e) => {
                              const newScenes = [...scriptConfig.scenes];
                              newScenes[i].headline = e.target.value;
                              setScriptConfig({ ...scriptConfig, scenes: newScenes });
                            }}
                            className="w-1/2 rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-xs text-white"
                          />
                          <input
                            type="text"
                            placeholder="Subtítulo descritivo"
                            value={sc.sub}
                            onChange={(e) => {
                              const newScenes = [...scriptConfig.scenes];
                              newScenes[i].sub = e.target.value;
                              setScriptConfig({ ...scriptConfig, scenes: newScenes });
                            }}
                            className="w-1/2 rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-xs text-slate-300"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Seletor de Ritmo & Duração */}
              <div className="mt-6">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Clock size={14} className="text-sky-400" /> Ritmo & Duração do Reel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PACING_OPTIONS.map((opt) => (
                    <button
                      key={opt.duration}
                      onClick={() => setSelectedDuration(opt.duration)}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                        selectedDuration === opt.duration
                          ? "border-sky-500 bg-sky-500/10 shadow-lg shadow-sky-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-white">{opt.label}</span>
                        {selectedDuration === opt.duration && <Check size={14} className="text-sky-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seletor de Transições Profissionais */}
              <div className="mt-6">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Layers size={14} className="text-purple-400" /> Efeitos de Transição entre Cenas
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TRANSITIONS_LIST.map((tr) => (
                    <button
                      key={tr.id}
                      onClick={() => setSelectedTransition(tr.id)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition ${
                        selectedTransition === tr.id
                          ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <span className="text-lg">{tr.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{tr.label}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{tr.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configurações de Overlays Visuais & Áudio */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Trilha Sonora */}
                <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3.5 border border-white/10">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={toggleAudioPreview}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-xs transition ${
                        isPlayingPreviewAudio
                          ? "bg-indigo-500 text-white animate-pulse"
                          : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30"
                      }`}
                      title={isPlayingPreviewAudio ? "Pausar Prévia" : "Ouvir Prévia"}
                    >
                      {isPlayingPreviewAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                    <div>
                      <div className="text-xs font-bold text-white">Trilha Sonora Trend</div>
                      <div className="text-[10px] text-slate-400">Trend Hype Luxury</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIncludeMusic(!includeMusic)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      includeMusic ? "bg-indigo-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        includeMusic ? "translate-x-4" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Overlays Switches */}
                <div className="flex items-center justify-around rounded-2xl bg-white/5 p-3.5 border border-white/10 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showProgressBar}
                      onChange={(e) => setShowProgressBar(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Barra Topo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showPriceBadge}
                      onChange={(e) => setShowPriceBadge(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Badge Preço</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={showCaptions}
                      onChange={(e) => setShowCaptions(e.target.checked)}
                      className="rounded accent-sky-500"
                    />
                    <span>Legendas</span>
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Ações Inferiores */}
        <div className="mt-8 pt-4 border-t border-white/10">
          {mode === "upload_custom" ? (
            <div>
              <button
                onClick={handleSaveCustomVideo}
                disabled={isCustomUploading || !customFile}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 py-4 font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
              >
                {isCustomUploading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Enviando Vídeo ({customUploadProgress}%)...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Salvar Vídeo no Anúncio
                  </>
                )}
              </button>
              {isCustomUploading && (
                <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-sky-400 h-full rounded-full transition-all duration-150"
                    style={{ width: `${customUploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              {step === "preview" && (
                <button
                  onClick={handleGenerateVideo}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 py-4 font-black text-white shadow-xl shadow-sky-500/20 transition-all hover:opacity-95 active:scale-[0.98]"
                >
                  <Film size={20} />
                  Renderizar Reels Profissional ({selectedDuration}s)
                </button>
              )}

              {step === "result" && (
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    <a
                      href={videoUrl!}
                      download={`reels-realstock-${propertyId}.mp4`}
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3.5 text-xs font-bold text-white transition hover:bg-white/10"
                    >
                      <Download size={16} />
                      Baixar Arquivo
                    </a>

                    <button
                      onClick={() => {
                        setStep("preview");
                        setIsPaid(false);
                      }}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-xs font-bold text-slate-300 hover:text-white transition"
                    >
                      Ajustar Estilo
                    </button>
                  </div>

                  {!isPaid ? (
                    <button
                      onClick={async () => {
                        try {
                          if (!videoBlob) {
                            alert("Vídeo não encontrado para incorporar.");
                            return;
                          }
                          setIsIncorporateLoading(true);
                          setIncorporateProgress(5);

                          const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";

                          // 1. Obter URL assinada para upload direto ao Supabase Storage (sem limite de 4.5MB da Vercel)
                          const signRes = await fetch("/api/minha-conta/video-upload", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "sign-url",
                              propertyId,
                              extension: ext,
                            }),
                          });
                          const signData = await signRes.json();
                          if (!signData.success || !signData.signedUrl) {
                            throw new Error(signData.error || "Erro ao obter permissão de envio.");
                          }

                          // 2. Upload direto para o Supabase Storage com progresso em tempo real
                          const formData = new FormData();
                          formData.append("cacheControl", "3600");
                          formData.append("", videoBlob, `reels-${propertyId}.${ext}`);

                          await new Promise((resolve, reject) => {
                            const xhr = new XMLHttpRequest();
                            xhr.open("PUT", signData.signedUrl);
                            xhr.setRequestHeader("x-upsert", "true");
                            xhr.upload.onprogress = (event) => {
                              if (event.lengthComputable) {
                                setIncorporateProgress(5 + Math.round((event.loaded * 90) / event.total));
                              }
                            };
                            xhr.onload = () => {
                              if (xhr.status >= 200 && xhr.status < 300) {
                                resolve(null);
                              } else {
                                reject(new Error("Erro ao salvar arquivo no armazenamento (" + xhr.status + ")"));
                              }
                            };
                            xhr.onerror = () => reject(new Error("Falha na rede durante o envio do vídeo."));
                            xhr.send(formData);
                          });

                          setIncorporateProgress(96);

                          // 3. Confirmar e associar o vídeo ao anúncio no banco de dados
                          const completeRes = await fetch("/api/minha-conta/video-upload", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "complete",
                              propertyId,
                              filePath: signData.filePath,
                              orderID: "FREE",
                            }),
                          });
                          const completeData = await completeRes.json();
                          if (!completeData.success) {
                            throw new Error(completeData.error || "Erro ao vincular vídeo ao anúncio.");
                          }

                          setIncorporateProgress(100);
                          setIsPaid(true);
                          if (onSuccess) onSuccess(completeData.videoUrl);
                          alert("Sucesso! O vídeo cinematográfico foi incorporado ao anúncio com sucesso.");
                        } catch (e: any) {
                          alert("Erro ao incorporar: " + e.message);
                        } finally {
                          setIsIncorporateLoading(false);
                          setIncorporateProgress(0);
                        }
                      }}
                      disabled={isIncorporateLoading}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-4 font-black text-white shadow-xl shadow-emerald-600/20 transition active:scale-[0.98]"
                    >
                      {isIncorporateLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Salvando no Anúncio ({incorporateProgress}%)...
                        </>
                      ) : (
                        <>
                          <Rocket size={18} />
                          Incorporar ao Anúncio Agora (Gratuito)
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 py-3 text-xs font-bold text-emerald-400">
                      <CheckCircle2 size={16} /> Vídeo Incorporado ao Anúncio!
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
