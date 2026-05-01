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
  propertyId: number;
}

export default function ViralizarModal({ isOpen, onClose, propertyTitle, propertyCity, propertyState, images, propertyId }: ViralizarModalProps) {
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
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
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

  async function handleLaunch() {
    if (!activeOrderID) return;
    setStep("executing");
    addLog("Comando de lançamento recebido. Calibrando motor...");
    
    setTimeout(() => {
        startVideoPipeline(activeOrderID);
    }, 1500);
  }

  async function startVideoPipeline(orderID: string) {
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

    // Pre-load
    const loadedImages: HTMLImageElement[] = [];
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
        const audio = new Audio("/music/trend-hype.mp3");
        audio.loop = true;
        recordingAudioRef.current = audio;
        await new Promise(resolve => { audio.oncanplaythrough = resolve; setTimeout(resolve, 2000); });
        const source = audioContextRef.current.createMediaElementSource(audio);
        const destination = audioContextRef.current.createMediaStreamDestination();
        source.connect(destination);
        const audioTrack = destination.stream.getAudioTracks()[0];
        if (audioTrack) finalStream = new MediaStream([...stream.getVideoTracks(), audioTrack]);
        await audio.play();
    } catch (e) { addLog("Aviso: Áudio bypass."); }

    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    const recorder = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: 1500000 });
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
        addLog(`Captura concluída. Total: ${chunksRef.current.length} pedaços.`);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size === 0) {
            alert("Erro: O navegador não capturou dados de vídeo. Tente novamente.");
            setStep("ready");
            return;
        }
        finishBundle(blob, orderID);
    };

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);
    if (loadedImages[0]) ctx.drawImage(loadedImages[0], 0, 0, width, height);
    
    addLog("Iniciando gravação...");
    recorder.start(1000);
    await new Promise(r => setTimeout(r, 1000));

    const targetTotalDuration = 60;
    const durationPerImage = Math.min(targetTotalDuration / loadedImages.length, 7.0);
    const totalFrames = (loadedImages.length * durationPerImage) * 30;

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

        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, height - 200, width, 200);
        
        ctx.fillStyle = "white";
        ctx.font = "bold 44px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(propertyTitle.toUpperCase(), width / 2, height - 110);

        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText(`${propertyCity || ''} - ${propertyState || ''}`.toUpperCase(), width / 2, height - 50);

        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    addLog("Processando buffer final...");
    await new Promise(r => setTimeout(r, 1500));
    if (recorder.state === "recording") recorder.stop();

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
            { id: 'fb_reels', platform: 'facebook', type: 'reels' }
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
      <div className="relative w-full max-w-5xl rounded-[40px] border border-white/10 bg-slate-900 p-8 shadow-2xl overflow-y-auto max-h-[95vh] scrollbar-hide">
        
        <button onClick={onClose} className="absolute right-8 top-8 z-50 rounded-full bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
          <X size={24} />
        </button>

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
                     <span className="text-4xl font-black text-white">R$ {(appliedCoupon === "Leo10" ? 0 : (fees?.totalFinal || 0)).toFixed(2)}</span>
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
                onClick={() => {
                  if (coupon.toUpperCase() === "LEO10") {
                    setAppliedCoupon("Leo10");
                    alert("CUPOM APLICADO: 100% DE DESCONTO!");
                  } else {
                    alert("CUPOM INVÁLIDO");
                  }
                }}
                className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
              >
                APLICAR
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

            {appliedCoupon === "Leo10" ? (
              <button 
                onClick={() => {
                  setActiveOrderID("FREE");
                  setStep("ready");
                }}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-5 font-black text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                ATIVAR COMANDO (GRÁTIS) <Rocket size={20} />
              </button>
            ) : !paypalOrderId ? (
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
                <button 
                  onClick={handleLaunch}
                  className="w-full rounded-3xl bg-gradient-to-r from-purple-600 to-indigo-600 py-6 text-xl font-black text-white shadow-2xl shadow-purple-500/40 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-4"
                >
                    INICIAR LANÇAMENTO <Rocket size={28} />
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
