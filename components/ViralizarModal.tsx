"use client";

import { useState, useEffect } from "react";
import { X, Rocket, CheckCircle2, Loader2, Sparkles, Zap, TrendingUp, Globe, Film, Camera, Share2 } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import confetti from "canvas-confetti";

interface ViralizarModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: number; // 0 para portfólio
  propertyTitle: string;
}

export default function ViralizarModal({ isOpen, onClose, propertyId, propertyTitle }: ViralizarModalProps) {
  const [step, setStep] = useState<"details" | "payment" | "executing" | "success">("details");
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState("");
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  
  const [isStarting, setIsStarting] = useState(false);
  const [viralizarServices, setViralizarServices] = useState<any[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(true);

  useEffect(() => {
    async function fetchFees() {
      try {
        const res = await fetch("/api/minha-conta/viralizar-fees");
        const data = await res.json();
        if (data.success) {
          const icons: Record<string, any> = {
            google: <Globe size={16} />,
            video: <Film size={16} />,
            ig_carousel: <Camera size={16} />,
            ig_reels: <Camera size={16} />,
            fb_carousel: <Share2 size={16} />,
            fb_reels: <Share2 size={16} />,
          };
          
          setViralizarServices(data.services.map((s: any) => ({
            ...s,
            icon: icons[s.id] || <Sparkles size={16} />
          })));
        }
      } catch (e) {
        console.error("Erro ao buscar taxas", e);
      } finally {
        setIsLoadingFees(false);
      }
    }
    fetchFees();
  }, []);


  const totalOriginal = viralizarServices.reduce((acc, s) => acc + (s.value || 0), 0);
  const bundlePrice = totalOriginal / 2;


  useEffect(() => {
    if (step === "success") {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
      
      return () => clearInterval(interval);
    }
  }, [step]);

  if (!isOpen) return null;

  async function handleStartViralizar() {
    if (bundlePrice <= 0) {
      alert("Erro ao calcular valor do pacote. Por favor, tente novamente em instantes.");
      return;
    }

    setIsStarting(true);
    try {
      const res = await fetch("/api/paypal/create-viralizar-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, amount: bundlePrice }),
      });
      const data = await res.json();
      if (data.success && data.paypal_order_id) {
        setPaypalOrderId(data.paypal_order_id);
        // Não mudamos mais o step, para manter a UI de detalhes visível com os botões do PayPal abaixo
      } else {
        alert("Erro ao preparar pagamento: " + (data.error || "Erro desconhecido"));
      }
    } catch (err) {
      alert("Erro de conexão com o servidor de pagamentos.");
    } finally {
      setIsStarting(false);
    }
  }

  async function executeBundle(orderID: string) {
    setStep("executing");
    setProgress(0);

    const actions = [
      { id: "capture", label: "Confirmando pagamento...", weight: 10 },
      { id: "google", label: "Configurando Patrocínio...", weight: 15 },
      { id: "video", label: "Gerando Vídeo IA...", weight: 15 },
      { id: "meta_ig", label: "Publicando no Instagram...", weight: 15 },
      { id: "meta_reels", label: "Publicando Reels...", weight: 15 },
      { id: "meta_fb", label: "Publicando no Facebook...", weight: 15 },
      { id: "meta_fb_reels", label: "Publicando Reels Facebook...", weight: 15 },
    ];

    let currentProgress = 0;

    try {
      // 1. Capture Order
      setCurrentAction(actions[0].label);
      const captureRes = await fetch("/api/paypal/capture-viralizar-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID, propertyId })
      });
      const captureData = await captureRes.json();
      if (!captureRes.ok || !captureData.success) throw new Error(captureData.error || "Erro ao capturar pagamento");
      
      currentProgress += actions[0].weight;
      setProgress(currentProgress);

      // 2. Loop through other actions (Simulated work for now, calling bundle executor backend)
      const bundleRes = await fetch("/api/minha-conta/execute-viralizar-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, orderID })
      });
      
      if (!bundleRes.ok) throw new Error("Erro na execução do pacote");

      for (let i = 1; i < actions.length; i++) {
        setCurrentAction(actions[i].label);
        await new Promise(r => setTimeout(r, 1500)); 
        currentProgress += actions[i].weight;
        setProgress(currentProgress);
      }

      setStep("success");
    } catch (err: any) {
      alert("Ocorreu um erro durante a execução: " + err.message);
      setStep("details");
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div className="relative w-full max-w-lg max-h-[98vh] overflow-y-auto no-scrollbar flex flex-col rounded-[32px] border border-white/10 bg-slate-950 p-5 md:p-6 shadow-2xl">
        {/* Background Glow */}
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <button 
          onClick={onClose}
          className="absolute right-6 top-6 z-10 text-slate-500 hover:text-white"
        >
          <X size={24} />
        </button>

        {step === "details" && (
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-[10px] uppercase tracking-widest mb-2">
              <Zap size={14} className="fill-purple-400" /> Pacote Viralizar
            </div>
            <h2 className="text-2xl font-black text-white">Deixe seu anúncio preparado para as redes sociais</h2>
            <p className="mt-2 text-slate-400 text-xs leading-relaxed">
              Ative todos os nossos serviços de marketing de uma vez e economize agora.
            </p>

            <div className="mt-4 space-y-2">
              {viralizarServices.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 p-3 transition-all hover:bg-white/10">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                      {s.icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-200">{s.name}</span>
                      <span className="text-[10px] text-slate-500">
                        {s.value > 0 
                          ? `R$ ${Number(s.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` 
                          : "Grátis"}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">INCLUSO</div>
                </div>
              ))}
              {isLoadingFees && <div className="text-center text-xs text-slate-500 animate-pulse">Carregando taxas...</div>}
            </div>

            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-2xl p-4 border border-purple-500/30">
               <div>
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">Oferta Exclusiva</div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-slate-500 line-through text-sm">R$ {totalOriginal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                     <span className="text-3xl font-black text-white">R$ {bundlePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase mt-1">50% de Desconto Ativado</div>
               </div>
                <button 
                  onClick={handleStartViralizar}
                  disabled={isStarting || isLoadingFees || !!paypalOrderId}
                  className="group flex items-center gap-2 rounded-xl bg-purple-500 px-6 py-4 font-bold text-white transition-all hover:bg-purple-400 shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processando...
                    </>
                  ) : paypalOrderId ? (
                    <>
                      Aguardando Pagamento
                      <CheckCircle2 size={18} />
                    </>
                  ) : (
                    <>
                      Viralizar
                      <Rocket size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </>
                  )}
                </button>
            </div>

            {paypalOrderId && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <p className="text-center text-xs text-slate-400 mb-4">Finalize com o PayPal abaixo:</p>
                  <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || "", currency: "BRL" }}>
                    <PayPalButtons 
                      style={{ layout: "vertical", shape: "rect", height: 45 }}
                      createOrder={async () => paypalOrderId}
                      onApprove={async (data) => {
                        executeBundle(data.orderID);
                      }}
                    />
                  </PayPalScriptProvider>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-2xl bg-white/5 border border-white/5 p-3">
              <p className="text-[10px] text-slate-400 leading-relaxed text-center italic">
                Após a ativação desse serviço você poderá contratar qualquer serviço de impulsionamento da Meta e do Google diretamente do site da RealStock, podendo escolher qual impulsionar, além de destacar e colocar o anúncio nos primeiros da lista de pesquisa do site.
              </p>
            </div>
          </div>
        )}


        {step === "executing" && (
          <div className="relative z-10 text-center py-12">
            <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
              <Loader2 className="h-24 w-24 animate-spin text-purple-500 opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Rocket className="h-10 w-10 text-purple-400 animate-bounce" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">{currentAction}</h3>
            <div className="mx-auto w-64 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
               <div 
                 className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500" 
                 style={{ width: `${progress}%` }}
               />
            </div>
            <p className="mt-4 text-slate-500 text-xs uppercase font-black tracking-widest">{progress}% CONCLUÍDO</p>
          </div>
        )}

        {step === "success" && (
          <div className="relative z-10 text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
               <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black text-white mb-4">Míssil Lançado!</h2>
            <p className="mx-auto max-w-sm text-slate-300 leading-relaxed">
              Seu anúncio está preparado para ser impulsionado nas redes sociais a qualquer hora, boa sorte!
            </p>
            <button 
              onClick={onClose}
              className="mt-10 rounded-2xl bg-white px-8 py-4 font-bold text-slate-900 transition-all hover:bg-slate-200"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
