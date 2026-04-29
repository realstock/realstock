"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, Download, Film, Loader2, Sparkles, Wand2, CheckCircle2, ShieldCheck, Rocket, Music } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface VideoCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyCity?: string | null;
  propertyState?: string | null;
  images: { imageUrl: string }[];
  propertyId: number;
  onSuccess?: (videoUrl: string) => void;
}

export default function VideoCreatorModal({ isOpen, onClose, propertyTitle, propertyCity, propertyState, images, propertyId, onSuccess }: VideoCreatorModalProps) {
  const [step, setStep] = useState<"preview" | "generating" | "result">("preview");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isIncorporateLoading, setIsIncorporateLoading] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [includeMusic, setIncludeMusic] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudioPreview = async () => {
    try {
      if (isPlayingPreview) {
        audioPreviewRef.current?.pause();
        setIsPlayingPreview(false);
      } else {
        const LOCAL_MUSIC_URL = "/music/trend-hype.mp3"; 
        
        if (!audioPreviewRef.current) {
          audioPreviewRef.current = new Audio(LOCAL_MUSIC_URL);
          audioPreviewRef.current.loop = true;
        }
        
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        await audioPreviewRef.current.play();
        setIsPlayingPreview(true);
        setIncludeMusic(true);
      }
    } catch (err) {
      console.error("Erro ao tocar prévia:", err);
      setIsPlayingPreview(false);
    }
  };

  // Carrossel de prévia automática
  useEffect(() => {
    if (isOpen && step === "preview") {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, step, images.length]);

  if (!isOpen) return null;

  async function handleGenerateVideo() {
    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    }
    setStep("generating");
    setProgress(0);
    chunksRef.current = [];

    const canvas = canvasRef.current;
    if (!canvas) return;


    // Configurações do vídeo (9:16 para Reels/Mobile)
    const width = 720;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 1. Pre-load de todas as imagens
    const loadedImages: HTMLImageElement[] = [];
    for (let i = 0; i < images.length; i++) {
        setProgress(Math.round(((i + 1) / images.length) * 20)); // Primeiros 20% para o carregamento
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = images[i].imageUrl;
        await new Promise((resolve) => {
            img.onload = () => {
                loadedImages.push(img);
                resolve(null);
            };
            img.onerror = () => {
                console.error("Erro ao carregar imagem:", images[i].imageUrl);
                resolve(null);
            };
        });
    }

    if (loadedImages.length === 0) {
        alert("Não foi possível carregar as imagens do anúncio.");
        setStep("preview");
        return;
    }

    const stream = canvas.captureStream(30); // Sincronizado com os 30fps da gravação
    let finalStream = stream;

    // 1.5 Preparar Áudio se solicitado
    if (includeMusic) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        const LOCAL_MUSIC_URL = "/music/trend-hype.mp3"; 

        const audio = new Audio(LOCAL_MUSIC_URL);
        audio.loop = true;
        recordingAudioRef.current = audio;
        
        await new Promise((resolve) => {
          audio.oncanplaythrough = resolve;
          setTimeout(resolve, 3000);
        });

        const source = audioContextRef.current.createMediaElementSource(audio);
        const gainNode = audioContextRef.current.createGain();
        gainNode.gain.value = 0.8;
        
        const destination = audioContextRef.current.createMediaStreamDestination();
        
        source.connect(gainNode);
        gainNode.connect(destination);
        
        const silenceGain = audioContextRef.current.createGain();
        silenceGain.gain.value = 0;
        gainNode.connect(silenceGain);
        silenceGain.connect(audioContextRef.current.destination);

        const audioTrack = destination.stream.getAudioTracks()[0];
        if (audioTrack) {
          finalStream = new MediaStream([
            ...stream.getVideoTracks(),
            audioTrack
          ]);
        }
        
        await audio.play();
      } catch (err) {
        console.warn("Erro ao configurar áudio:", err);
      }
    }

    // 1.8 Seleção de codec simplificada para máxima compatibilidade
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') 
      ? 'video/mp4' 
      : 'video/webm';
    
    console.log("Iniciando gravação com MimeType:", mimeType);

    chunksRef.current = [];
    const recorder = new MediaRecorder(finalStream, { 
      mimeType,
      videoBitsPerSecond: 1500000 // Reduzido para 1.5Mbps para maior estabilidade
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      console.log("Gravação finalizada. Total de chunks:", chunksRef.current.length);
      setStep("result");
      setProgress(100);
      finalStream.getTracks().forEach(t => t.stop());
      if (recordingAudioRef.current) {
        recordingAudioRef.current.pause();
        recordingAudioRef.current.currentTime = 0;
        recordingAudioRef.current = null;
      }
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
    };

    // Renderizar o PRIMEIRO QUADRO antes de começar o recorder (ajuda o Safari)
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);
    if (loadedImages[0]) {
      ctx.drawImage(loadedImages[0], 0, 0, width, height);
    }
    
    // Pequena espera antes de começar de fato
    await new Promise(r => setTimeout(r, 100));
    recorder.start(1000);

    // 2. Lógica de renderização frame-a-frame otimizada
    const durationPerImage = 2.5; 
    const totalDuration = loadedImages.length * durationPerImage;
    const fps = 30;
    const totalFrames = totalDuration * fps;

    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = frame / fps;
      const imageIndex = Math.floor(currentTime / durationPerImage);
      const imageProgress = (currentTime % durationPerImage) / durationPerImage;
      
      setProgress(20 + Math.round((frame / totalFrames) * 80));

      const img = loadedImages[imageIndex];
      if (!img) continue;

      // Limpar canvas
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);

      // Efeito de Zoom (Ken Burns)
      const scale = 1 + imageProgress * 0.15;
      const drawWidth = width * scale;
      const drawHeight = (img.height * (drawWidth / img.width));
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;

      ctx.save();
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      ctx.restore();

      // Overlay de Gradiente
      const grad = ctx.createLinearGradient(0, height * 0.6, 0, height);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, "rgba(0,0,0,0.9)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, height * 0.6, width, height * 0.4);

      // Texto: Título
      ctx.fillStyle = "white";
      ctx.font = "bold 44px Inter, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.textAlign = "center";
      
      const words = propertyTitle.toUpperCase().split(" ");
      let titleY = height - 240;
      if (words.length > 3) {
          ctx.fillText(words.slice(0, 3).join(" "), width / 2, titleY);
          ctx.fillText(words.slice(3).join(" "), width / 2, titleY + 55);
          titleY += 55;
      } else {
          ctx.fillText(propertyTitle.toUpperCase(), width / 2, titleY);
      }

      // Texto: Cidade e Estado
      const locationText = [propertyCity, propertyState].filter(Boolean).join(" • ");
      if (locationText) {
          ctx.fillStyle = "#94a3b8"; // slate-400
          ctx.font = "32px Inter, sans-serif";
          ctx.fillText(locationText.toUpperCase(), width / 2, titleY + 60);
      }

      // Linha decorativa
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(width / 2 - 120, titleY + 90, 240, 4);

      // Desenhar site/footer
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "500 24px Inter, sans-serif";
      ctx.fillText("www.realstock.com.br", width / 2, height - 60);

      // Sincronizar com a gravação
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    recorder.stop();
    // Limpeza de áudio será feita pelo browser ou por referência se necessário
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl overflow-y-auto max-h-[95vh] rounded-[32px] border border-white/10 bg-slate-950 shadow-2xl scrollbar-hide">
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-white/20"
        >
          <X size={24} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Lado Esquerdo: Preview */}
          <div className="relative flex aspect-[9/16] items-center justify-center bg-slate-900 lg:aspect-auto lg:h-[600px]">
            {step === "preview" && (
              <div className="relative h-full w-full overflow-hidden">
                <img 
                  src={images[currentImageIndex]?.imageUrl} 
                  className="h-full w-full object-cover transition-all duration-1000 scale-105"
                  alt="Preview"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-12 left-0 w-full px-6 text-center">
                  <h3 className="text-xl font-bold uppercase tracking-tight">{propertyTitle}</h3>
                  <p className="mt-2 text-sky-400 font-bold text-xs">REALSTOCK • O SEU IMÓVEL EM DESTAQUE</p>
                </div>
              </div>
            )}

            {step === "generating" && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-sky-500" />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                    {progress}%
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-400">Criando vídeo personalizado...</p>
              </div>
            )}

            {step === "result" && videoUrl && (
              <video 
                src={videoUrl} 
                controls 
                autoPlay 
                loop 
                className="h-full w-full object-contain bg-black"
              />
            )}

            {/* Canvas oculto para renderização */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Lado Direito: Controles */}
          <div className="flex flex-col justify-center p-8 lg:p-12">
            <div className="mb-8">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-[10px] uppercase tracking-widest mb-2">
                <Sparkles size={14} /> Inteligência Visual RealStock
              </div>
              <h2 className="text-3xl font-black text-white">Criador de Vídeos</h2>
              <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                Transforme as fotos do seu anúncio em um vídeo profissional de alta conversão para Instagram Reels, TikTok e Google Ads.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 rounded-2xl bg-white/5 p-4 border border-white/5">
                <div className="bg-sky-500/20 p-2 rounded-lg text-sky-400">
                  <Play size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Efeito Ken Burns</div>
                  <div className="text-xs text-slate-500 mt-1">Movimentos suaves de câmera para dar vida às fotos.</div>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl bg-white/5 p-4 border border-white/5">
                <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                  <Wand2 size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Legendas Automáticas</div>
                  <div className="text-xs text-slate-500 mt-1">Título e site adicionados com design moderno.</div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl bg-indigo-500/10 p-4 border border-indigo-500/20">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleAudioPreview}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${isPlayingPreview ? 'bg-indigo-500 text-white animate-pulse' : 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'}`}
                    title={isPlayingPreview ? "Pausar Prévia" : "Ouvir Prévia"}
                  >
                    {isPlayingPreview ? <Music size={14} /> : <Play size={14} />}
                    {isPlayingPreview ? "TOCANDO" : "OUVIR"}
                  </button>
                  <div>
                    <div className="text-sm font-bold text-white">Trilha Sonora Trend</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black">Modern Ambient / Luxury</div>
                  </div>
                </div>
                <button 
                  onClick={() => setIncludeMusic(!includeMusic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeMusic ? 'bg-indigo-500' : 'bg-slate-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${includeMusic ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-3">
              {step === "preview" && (
                <button 
                  onClick={handleGenerateVideo}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 font-bold text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 active:scale-95"
                >
                  <Film size={20} />
                  Gerar Vídeo Agora
                </button>
              )}

              {step === "result" && (
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                     <h4 className="text-sm font-bold text-white mb-2">Escolha uma opção:</h4>
                     <div className="grid grid-cols-1 gap-3">
                        <a 
                          href={videoUrl!} 
                          download={`video-imovel-${propertyId}.webm`}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"
                        >
                          <Download size={18} />
                          Baixar Vídeo (WEBM)
                        </a>

                        {!isPaid ? (
                          <>
                            <div className="my-2 h-px bg-white/10" />
                            <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase mb-2">
                               <Rocket size={14} /> Power Up: Reels Automático
                            </div>
                            <p className="text-[11px] text-slate-500 mb-4 italic">
                               O vídeo ficará salvo no seu anúncio e você poderá postá-lo como Reels no Instagram com 1 clique. (GRATUITO)
                            </p>
                            
                            <button 
                              onClick={async () => {
                                try {
                                  setIsIncorporateLoading(true);
                                  const formData = new FormData();
                                  formData.append("file", videoBlob!, `video-${propertyId}.webm`);
                                  formData.append("orderID", "FREE");
                                  formData.append("propertyId", propertyId.toString());

                                  const res = await fetch("/api/minha-conta/video-upload", { 
                                    method: "POST", 
                                    body: formData 
                                  });
                                  const result = await res.json();
                                  
                                  if (result.success) {
                                    setIsPaid(true);
                                    if (onSuccess) onSuccess(result.videoUrl);
                                    alert("Sucesso! O vídeo agora faz parte do seu anúncio.");
                                  } else throw new Error(result.error);
                                } catch (e: any) {
                                  alert("Erro ao finalizar incorporação: " + e.message);
                                } finally {
                                  setIsIncorporateLoading(false);
                                }
                              }}
                              disabled={isIncorporateLoading}
                              className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 active:scale-95 disabled:opacity-50"
                            >
                              {isIncorporateLoading ? <Loader2 className="animate-spin" size={18} /> : <Film size={18} />}
                              Incorporar ao Anúncio Agora
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 py-4 font-bold text-emerald-400">
                             <CheckCircle2 size={18} /> Vídeo Incorporado!
                          </div>
                        )}
                     </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                        setStep("preview");
                        setPaypalOrderId(null);
                        setIsPaid(false);
                    }}
                    className="text-xs text-slate-500 hover:text-white transition-colors"
                  >
                    Tentar outro formato
                  </button>
                </div>
              )}
            </div>

            <p className="mt-6 text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold">
              Versão Beta • Processamento Local 100% Seguro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
