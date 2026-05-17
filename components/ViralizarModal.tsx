"use client";

import { useState, useEffect, useRef } from "react";
import { X, Play, Loader2, Sparkles, Rocket, CheckCircle2, ExternalLink, Film, Info } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

interface ViralizarModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyTitle: string;
  propertyCity?: string | null;
  propertyState?: string | null;
  images: { imageUrl: string, title?: string; city?: string; state?: string }[];
  videos?: { videoUrl: string }[];
  reelsMusicUrl?: string | null;
  reelsVideoUrl?: string | null;
  propertyId: number;
}

function renderOverlays(ctx: CanvasRenderingContext2D, width: number, height: number, title: string, city?: string | null, state?: string | null) {
  // Overlay de Gradiente
  const grad = ctx.createLinearGradient(0, height * 0.6, 0, height);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(1, "rgba(0,0,0,0.9)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, height * 0.6, width, height * 0.4);

  // Texto: Título
  const displayTitle = title === "Meu Portfólio Premium" ? "Imóveis em Destaque" : title.toUpperCase();
  ctx.fillStyle = "white";
  ctx.font = "bold 44px sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;
  ctx.textAlign = "center";
  
  const words = displayTitle.split(" ");
  let titleY = height - 240;
  if (words.length > 3) {
      ctx.fillText(words.slice(0, 3).join(" "), width / 2, titleY);
      ctx.fillText(words.slice(3).join(" "), width / 2, titleY + 55);
      titleY += 55;
  } else {
      ctx.fillText(displayTitle, width / 2, titleY);
  }

  // Texto: Cidade e Estado
  const locationText = [city, state].filter(Boolean).join(" - ");
  if (locationText) {
      ctx.fillStyle = "#38bdf8"; // sky-400
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(locationText.toUpperCase(), width / 2, titleY + 60);
  }

  // Texto: Website (Rodapé do vídeo)
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("www.realstock.com.br", width / 2, titleY + 115);

  // Linha decorativa
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(width / 2 - 120, titleY + 80, 240, 2);
}

export default function ViralizarModal(props: ViralizarModalProps) {
  const { 
    isOpen, 
    onClose, 
    propertyTitle, 
    propertyCity, 
    propertyState, 
    images, 
    videos = [],
    reelsMusicUrl,
    propertyId 
  } = props;
  
  const [step, setStep] = useState<"details" | "ready" | "executing" | "success">("details");
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState("Aguardando...");
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [fees, setFees] = useState<{ 
    services: { id: string; name: string; value: number }[];
    totalOriginal: number;
    totalFinal: number;
  } | null>(null);
  const [activeOrderID, setActiveOrderID] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addLog = (msg: string) => {
    console.log(`[VIRALIZAR DEBUG]: ${msg}`);
    setDebugLogs(prev => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev].slice(0, 10));
  };

  const [tasks, setTasks] = useState([
    { id: 'payment', label: 'Pagamento Confirmado', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'video', label: 'Gerando Vídeo IA (Manual Motor)', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'upload', label: 'Salvando no Servidor', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'ig_carousel', label: 'Instagram: Carrossel', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'ig_reels', label: 'Instagram: Reels', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'fb_feed', label: 'Facebook: Feed', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'fb_reels', label: 'Facebook: Reels', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'x_carousel', label: 'X (Twitter): Carrossel', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
    { id: 'x_reels', label: 'X (Twitter): Reels', status: 'pending' as 'pending' | 'loading' | 'success' | 'error', permalink: '' },
  ]);

  const updateTaskStatus = (id: string, status: 'pending' | 'loading' | 'success' | 'error', permalink: string = '') => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, permalink: permalink || t.permalink } : t));
  };

  useEffect(() => {
    if (isOpen) {
      fetch(`/api/minha-conta/viralizar-fees?propertyId=${propertyId}`)
        .then(res => res.json())
        .then(data => setFees(data))
        .catch(err => console.error("Erro ao carregar taxas:", err));

      fetch(`/api/minha-conta/credits`)
        .then(res => res.json())
        .then(data => { if (data.success) setUserCredits(data.credits); })
        .catch(err => console.error("Erro ao carregar créditos:", err));
    } else {
      setStep("details");
      setPaypalOrderId(null);
      setDebugLogs([]);
      setProgress(0);
      setActiveOrderID(null);
      setTasks(tasks.map(t => ({ ...t, status: 'pending', permalink: '' })));
    }
  }, [isOpen, propertyId]);

  async function handleStartViralizar() {
    if (!activeOrderID) return;
    setStep("executing");
    addLog("Comando de lançamento recebido. Calibrando motor...");
    
    // NOVO: Verificar e Limpar postagens anteriores antes de começar
    try {
        addLog("Verificando integridade de postagens anteriores...");
        const resDelete = await fetch(`/api/minha-conta/anuncios/${propertyId}/posts`, { method: "DELETE" });
        const dataDelete = await resDelete.json();
        
        if (dataDelete.success && dataDelete.deletedCount > 0) {
            addLog(`Sincronização concluída: ${dataDelete.deletedCount} registros antigos removidos.`);
        } else {
            addLog("Nenhuma postagem anterior encontrada. Caminho livre!");
        }
    } catch (e) {
        console.error("Erro ao sincronizar posts:", e);
        addLog("Aviso: Falha na sincronização inicial, prosseguindo com cautela...");
    }

    setTimeout(() => {
        startVideoPipeline();
    }, 1500);
  }

  async function startVideoPipeline() {
    if (props.reelsVideoUrl) {
        addLog("Vídeo IA já detectado no anúncio. Utilizando versão existente...");
        setStep("executing");
        setProgress(100);
        
        await new Promise(r => setTimeout(r, 1500));
        
        try {
            const response = await fetch(props.reelsVideoUrl);
            const blob = await response.blob();
            finishBundle(blob, activeOrderID || "CREDIT"); 
            return;
        } catch (e) {
            addLog("Aviso: Não foi possível carregar o vídeo existente. Gerando um novo...");
        }
    }

    updateTaskStatus('payment', 'success');
    updateTaskStatus('video', 'loading');
    setCurrentAction("Renderizando Reels...");
    
    chunksRef.current = [];
    const canvas = canvasRef.current;
    if (!canvas) {
        addLog("ERRO CRÍTICO: Canvas ausente.");
        return;
    }

    const width = 720;
    const height = 1280;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;

    // 1. Pre-load de todas as mídias
    const loadedImages: HTMLImageElement[] = [];
    const loadedVideos: HTMLVideoElement[] = [];

    // Carregar Vídeos
    if (videos && videos.length > 0) {
        for (let i = 0; i < videos.length; i++) {
            const vid = document.createElement("video");
            vid.src = videos[i].videoUrl;
            vid.crossOrigin = "anonymous";
            vid.muted = true;
            vid.playsInline = true;
            await new Promise((resolve) => {
                vid.onloadeddata = () => resolve(null);
                vid.onerror = () => resolve(null);
                setTimeout(resolve, 5000);
            });
            loadedVideos.push(vid);
        }
    }

    // Carregar Imagens
    for (let i = 0; i < images.length; i++) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = images[i].imageUrl;
        await new Promise((resolve) => {
            img.onload = () => { loadedImages.push(img); resolve(null); };
            img.onerror = () => resolve(null);
        });
    }

    const stream = canvas.captureStream(30);
    let finalStream = stream;

    // Áudio
    try {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume();

        const audio = new Audio(reelsMusicUrl || "/music/trend-hype.mp3");
        audio.crossOrigin = "anonymous";
        audio.loop = true;
        recordingAudioRef.current = audio;
        await new Promise(resolve => { 
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
        
        // Output quase mudo para monitoramento
        const outGain = audioContextRef.current.createGain();
        outGain.gain.value = 0.01;
        gainNode.connect(outGain);
        outGain.connect(audioContextRef.current.destination);

        const aTracks = destination.stream.getAudioTracks();
        if (aTracks.length > 0) {
            addLog("Trilha de áudio capturada com sucesso.");
            finalStream = new MediaStream([...stream.getVideoTracks(), aTracks[0]]);
        }
        
        try {
            await audio.play();
        } catch (playErr) {
            addLog("Aviso: Playback de áudio contido.");
        }
    } catch (e) { addLog("Aviso: Erro na captura de áudio."); }

    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') 
        ? 'video/mp4;codecs=avc1' 
        : MediaRecorder.isTypeSupported('video/mp4') 
            ? 'video/mp4' 
            : 'video/webm';
    const recorder = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: 1000000 }); 
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => { 
        if (e.data.size > 0) {
            chunksRef.current.push(e.data);
            if (chunksRef.current.length % 5 === 0) addLog(`Capturando: ${chunksRef.current.length} chunks...`);
        }
    };

    let stopFired = false;
    recorder.onstop = async () => {
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

        addLog(`Captura concluída. Total: ${chunksRef.current.length} pedaços.`);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 100) {
            alert("Erro: O navegador não capturou dados de vídeo. Tente novamente.");
            setStep("ready");
            return;
        }
        finishBundle(blob, activeOrderID || "CREDIT");
    };

    // Warm-up para o Safari
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);
    if (loadedVideos[0]) {
        const vid = loadedVideos[0];
        const scale = Math.max(width / vid.videoWidth, height / vid.videoHeight);
        const dW = vid.videoWidth * scale;
        const dH = vid.videoHeight * scale;
        ctx.drawImage(vid, (width - dW) / 2, (height - dH) / 2, dW, dH);
    } else if (loadedImages[0]) {
        const img = loadedImages[0];
        const scale = Math.max(width / img.width, height / img.height);
        const dW = img.width * scale;
        const dH = img.height * scale;
        ctx.drawImage(img, (width - dW) / 2, (height - dH) / 2, dW, dH);
    }
    renderOverlays(ctx, width, height, propertyTitle, propertyCity, propertyState);
    
    addLog("Sincronizando gravador...");
    await new Promise(r => setTimeout(r, 500));
    recorder.start(200); 
    await new Promise(r => setTimeout(r, 200));

    const fps = 30;

    // Lógica de colagem: Prioridade para Vídeos
    if (loadedVideos.length > 0) {
        for (let vIdx = 0; vIdx < loadedVideos.length; vIdx++) {
            const vid = loadedVideos[vIdx];
            const duration = Math.min(vid.duration, 8); 
            const frames = duration * fps;
            
            for (let f = 0; f < frames; f++) {
                setProgress(Math.round(((vIdx * frames + f) / (loadedVideos.length * frames)) * 95));
                vid.currentTime = f / fps;
                
                await new Promise(resolve => {
                    const onSeeked = () => { vid.removeEventListener('seeked', onSeeked); resolve(null); };
                    vid.addEventListener('seeked', onSeeked);
                    setTimeout(resolve, 50);
                });

                ctx.fillStyle = "#020617";
                ctx.fillRect(0, 0, width, height);
                const scale = Math.max(width / vid.videoWidth, height / vid.videoHeight);
                const dW = vid.videoWidth * scale;
                const dH = vid.videoHeight * scale;
                ctx.drawImage(vid, (width - dW) / 2, (height - dH) / 2, dW, dH);

                renderOverlays(ctx, width, height, propertyTitle, propertyCity, propertyState);
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }
    } else {
        const targetTotalDuration = 30; 
        const durationPerImage = Math.min(targetTotalDuration / loadedImages.slice(0, 10).length, 4.0);
        const totalFrames = (loadedImages.slice(0, 10).length * durationPerImage) * 30;

        for (let frame = 0; frame < totalFrames; frame++) {
            const currentTime = frame / 30;
            const imageIndex = Math.floor(currentTime / durationPerImage);
            const imageProgress = (currentTime % durationPerImage) / durationPerImage;
            
            setProgress(Math.round((frame / totalFrames) * 100));

            const img = loadedImages[imageIndex];
            if (!img) continue;

            ctx.fillStyle = "#020617";
            ctx.fillRect(0, 0, width, height);

            const scale = 1 + imageProgress * 0.15;
            const dW = width * scale;
            const dH = (img.height * (dW / img.width));
            ctx.drawImage(img, (width - dW) / 2, (height - dH) / 2, dW, dH);

            renderOverlays(ctx, width, height, propertyTitle, propertyCity, propertyState);
            await new Promise(resolve => requestAnimationFrame(resolve));
        }
    }

    addLog("Processando buffer final...");
    setProgress(100);
    await new Promise(r => setTimeout(r, 1500));
    if (recorder.state === "recording") {
        recorder.stop();
    }
    
    // Fail-safe
    setTimeout(() => {
        if (!stopFired) {
            console.log("Failsafe: Forçando finalização no Viralizar...");
            recorder.dispatchEvent(new Event("stop"));
        }
    }, 3000);

    setTimeout(() => {
        if (!stopFired) {
            addLog("Aviso: Forçando fechamento.");
            recorder.onstop?.(new Event('stop'));
        }
    }, 4000);

    if (recordingAudioRef.current) recordingAudioRef.current.pause();
    finalStream.getTracks().forEach(t => t.stop());
  }

  async function finishBundle(videoBlob: Blob, orderID: string) {
    updateTaskStatus('video', 'success');
    updateTaskStatus('upload', 'loading');
    setCurrentAction("Salvando no servidor...");
    
    try {
        const formData = new FormData();
        formData.append("file", videoBlob, `viralizar-${propertyId}.mp4`);
        formData.append("propertyId", propertyId.toString());
        formData.append("orderID", orderID);
        const upRes = await fetch("/api/minha-conta/video-upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (!upData.success) throw new Error("Erro no upload.");
        updateTaskStatus('upload', 'success');

        const posts = [
            { id: 'ig_carousel', platform: 'instagram', type: 'carousel' },
            { id: 'ig_reels', platform: 'instagram', type: 'reels' },
            { id: 'fb_feed', platform: 'facebook', type: 'carousel' },
            { id: 'fb_reels', platform: 'facebook', type: 'reels' },
            { id: 'x_carousel', platform: 'x', type: 'carousel' },
            { id: 'x_reels', platform: 'x', type: 'reels' }
        ];

        for (const post of posts) {
            updateTaskStatus(post.id, 'loading');
            setCurrentAction(`Postando no ${post.platform}...`);
            const res = await fetch("/api/minha-conta/execute-viralizar-bundle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ propertyId, orderID, platform: post.platform, targetPostType: post.type })
            });
            const data = await res.json();
            if (data.success) updateTaskStatus(post.id, 'success', data.permalink);
            else { updateTaskStatus(post.id, 'error'); addLog(`Erro ${post.id}: ${data.error}`); }
        }
        setStep("success");
    } catch (err: any) {
        addLog(`ERRO: ${err.message}`);
        alert("Erro no pipeline: " + err.message);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-xl overflow-y-auto">
      <button 
        onClick={onClose} 
        className="fixed right-6 top-6 z-[10000] rounded-full bg-white/5 border border-white/10 p-3 text-slate-300 hover:bg-white/15 hover:text-white transition-all shadow-lg backdrop-blur-md hover:scale-105 active:scale-95"
        title="Fechar"
      >
        <X size={24} />
      </button>

      <div className="relative w-full max-w-5xl rounded-[40px] border border-white/10 bg-slate-900 p-8 shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide">

        {/* TELAS CONDICIONAIS */}
        {step === "details" && (
          <div className="max-w-2xl mx-auto text-center py-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 mb-6">
              <Rocket size={32} />
            </div>
            <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase italic">Viralizar Marketing</h1>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed italic">Pacote de Automação Social RealStock</p>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-8 text-left">
               <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-6 border-b border-white/5 pb-2">Extrato do Pacote</div>
               
               <div className="space-y-3 mb-8">
                  {fees?.services.map((s, i) => (
                    <div key={i} className="flex justify-between items-center">
                       <span className="text-xs text-slate-400 uppercase italic">{s.name}</span>
                       <span className="text-xs font-bold text-slate-200">R$ {s.value.toFixed(2)}</span>
                    </div>
                  ))}
               </div>

               <div className="border-t border-dashed border-white/10 pt-4 space-y-2">
                  <div className="flex justify-between items-center text-slate-500 line-through text-xs">
                     <span>Valor Original</span>
                     <span>R$ {fees?.totalOriginal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 text-xs font-black uppercase tracking-tighter">
                     <span>Desconto Especial (50%)</span>
                     <span>- R$ {(fees?.totalOriginal ? fees.totalOriginal * 0.5 : 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/5">
                     <span className="text-sm font-black text-white uppercase italic">Total do Investimento</span>
                     <span className="text-4xl font-black text-white">R$ {(fees?.totalFinal || 0).toFixed(2)}</span>
                  </div>
               </div>
            </div>

            {/* CAMPO DE CUPOM */}
            <div className="mb-8 flex gap-2">
              <input 
                type="text" 
                placeholder="CUPOM DE DESCONTO"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold uppercase tracking-widest focus:border-purple-500 outline-none transition-all"
              />
              <button 
                onClick={async () => {
                  if (!coupon) return;
                  setApplyingCoupon(true);
                  try {
                    const res = await fetch("/api/minha-conta/redeem-coupon", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ code: coupon, serviceType: "VIRALIZAR" })
                    });
                    const data = await res.json();
                    if (data.success) {
                      setUserCredits(c => c + 1);
                      setCoupon("");
                      alert("Cupom aplicado! Você ganhou 1 crédito para o Míssil.");
                    } else {
                      alert(data.error);
                    }
                  } catch(e: any) {
                    alert(e.message);
                  } finally {
                    setApplyingCoupon(false);
                  }
                }}
                disabled={applyingCoupon}
                className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {applyingCoupon ? "..." : "APLICAR"}
              </button>
            </div>

            {/* SALDO DE CRÉDITOS */}
            {userCredits > 0 && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Saldo de Cupons</div>
                  <div className="text-xl font-black text-white">{userCredits} CRÉDITOS</div>
                </div>
                <button 
                  onClick={() => {
                    setActiveOrderID("CREDIT");
                    setStep("ready");
                  }}
                  className="bg-emerald-500 hover:bg-emerald-400 px-6 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                >
                  USAR 1 CRÉDITO
                </button>
              </div>
            )}

            {!paypalOrderId ? (
              <button onClick={async () => {
                const res = await fetch("/api/paypal/create-viralizar-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propertyId }) });
                const data = await res.json();
                if (data.id) setPaypalOrderId(data.id);
              }} className="w-full rounded-2xl bg-purple-500 py-5 font-black text-white shadow-xl shadow-purple-500/20 hover:bg-purple-400 transition-all active:scale-95 flex items-center justify-center gap-3">
                ATIVAR COMANDO VIRALIZAR <Rocket size={20} />
              </button>
            ) : (
              <PayPalButtons style={{ layout: "vertical", shape: "rect" }} createOrder={async () => paypalOrderId} onApprove={async (data) => {
                setActiveOrderID(data.orderID);
                setStep("ready");
              }} />
            )}
          </div>
        )}

        {step === "ready" && (
            <div className="max-w-2xl mx-auto text-center py-12">
                <div className="h-24 w-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-8 mx-auto animate-pulse">
                    <CheckCircle2 size={48} />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 uppercase italic">Pagamento Confirmado!</h2>
                <p className="text-slate-400 text-lg mb-10 italic">Clique abaixo para iniciar a geração do vídeo e as postagens automáticas.</p>
                
                {props.reelsVideoUrl && (
                    <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                        <p className="text-xs font-bold text-emerald-400">✨ Vídeo IA já criado e pronto para uso!</p>
                    </div>
                )}

                <button 
                  onClick={handleStartViralizar}
                  className="w-full rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 py-6 text-xl font-black text-white shadow-2xl shadow-purple-500/40 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-4"
                >
                    {props.reelsVideoUrl ? "ATIVAR PACOTE COM VÍDEO EXISTENTE" : "INICIAR LANÇAMENTO"} <Rocket size={28} />
                </button>
            </div>
        )}

        {/* CENTRAL DE LANÇAMENTO (SEMPRE NO DOM) */}
        <div className={step === 'executing' ? "block" : "fixed -left-[9999px] opacity-0 pointer-events-none"}>
           <div className="flex flex-col lg:flex-row gap-8">
              <div className="flex-1 space-y-6">
                 <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase italic">Lançando Míssil...</h2>
                 <div className="space-y-3">
                    {tasks.map(task => (
                      <div key={task.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        task.status === 'loading' ? 'bg-purple-500/10 border-purple-500/50 scale-[1.02]' : 
                        task.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                        'bg-white/5 border-white/5 opacity-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 flex items-center justify-center rounded-full ${task.status === 'loading' ? 'bg-purple-500 animate-spin' : task.status === 'success' ? 'bg-emerald-500' : 'bg-slate-800'}`}>
                            {task.status === 'loading' ? <Loader2 size={16} /> : task.status === 'success' ? <CheckCircle2 size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />}
                          </div>
                          <span className="text-sm font-bold text-white uppercase italic tracking-tighter">{task.label}</span>
                        </div>
                        {task.status === 'success' && task.permalink && (
                          <a href={task.permalink} target="_blank" className="px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-white/20">Ver Post</a>
                        )}
                      </div>
                    ))}
                 </div>
              </div>
              <div className="w-full lg:w-[400px] flex flex-col gap-4">
                 <div className="relative aspect-[9/16] w-full rounded-[32px] overflow-hidden border border-white/10 bg-slate-900 shadow-2xl">
                    <canvas ref={canvasRef} className="w-full h-full object-cover" />
                    <div className="absolute bottom-8 left-6 right-6 z-30">
                       <div className="flex justify-between items-end mb-2">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest italic">{currentAction}</span>
                          <span className="text-xl font-black text-white">{progress}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                       </div>
                    </div>
                 </div>
                 <div className="p-4 rounded-2xl bg-black/60 border border-white/5 font-mono text-[9px] text-slate-500 h-32 overflow-y-auto">
                    {debugLogs.map((log, i) => <div key={i} className={i === 0 ? "text-white" : ""}>{log}</div>)}
                 </div>
              </div>
           </div>
        </div>

        {/* SUCESSO */}
        <div className={step === "success" ? "block" : "hidden"}>
          <div className="py-12 text-center lg:text-left">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="h-20 w-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mb-6 mx-auto lg:mx-0">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-5xl font-black text-white mb-6 tracking-tighter uppercase italic">Míssil Lançado!</h2>
                <p className="text-slate-400 text-lg mb-4 max-w-md mx-auto lg:mx-0 italic">Sua campanha foi automatizada com sucesso em todas as redes!</p>
                
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 mb-8 max-w-md">
                   <p className="text-emerald-400 font-bold mb-4 text-lg flex items-center gap-2">
                     <Rocket size={24} /> Míssil Lançado!
                   </p>
                   <p className="text-slate-300 text-sm mb-8 leading-relaxed">Parabéns! Suas publicações já estão no ar. Agora, para alcançar o máximo de clientes, você deve impulsionar este anúncio.</p>
                   <a 
                     href={`/minha-conta/anuncios/${propertyId}/turbinar`}
                     className="block w-full py-5 bg-purple-500 text-white font-black rounded-2xl text-center hover:bg-purple-400 transition-all shadow-xl shadow-purple-500/20 uppercase text-sm tracking-widest"
                   >
                     Turbinar Agora
                   </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
