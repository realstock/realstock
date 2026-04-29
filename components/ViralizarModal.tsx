"use client";

import { useState, useEffect } from "react";
import { X, Rocket, CheckCircle2, Loader2, Sparkles, Zap, TrendingUp, Globe, Film, Instagram, Facebook } from "lucide-react";
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
  
  const BUNDLE_PRICE = 99.00; // 50% de desconto de R$ 198,00

  const services = [
    { id: "google", name: "Patrocinar Site (Google Ads)", icon: <Globe size={16} /> },
    { id: "video", name: "Criar Vídeo IA", icon: <Film size={16} /> },
    { id: "ig_carousel", name: "Postar Carrossel Instagram", icon: <Instagram size={16} /> },
    { id: "ig_reels", name: "Postar Reel Instagram", icon: <Instagram size={16} /> },
    { id: "fb_carousel", name: "Postar Carrossel Facebook", icon: <Facebook size={16} /> },
  ];

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
    try {
      const res = await fetch("/api/paypal/create-viralizar-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, amount: BUNDLE_PRICE }),
      });
      const data = await res.json();
      if (data.success) {
        setPaypalOrderId(data.paypal_order_id);
        setStep("payment");
      } else {
        alert("Erro ao preparar pagamento: " + data.error);
      }
    } catch (err) {
      alert("Erro de conexão.");
    }
  }

  async function executeBundle(orderID: string) {
    setStep("executing");
    setProgress(0);

    const actions = [
      { id: "capture", label: "Confirmando pagamento...", weight: 10 },
      { id: "google", label: "Configurando Google Ads...", weight: 20 },
      { id: "video", label: "Gerando Vídeo IA...", weight: 25 },
      { id: "meta_ig", label: "Publicando no Instagram...", weight: 15 },
      { id: "meta_reels", label: "Publicando Reels...", weight: 15 },
      { id: "meta_fb", label: "Publicando no Facebook...", weight: 15 },
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
      <div className="relative w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-950 p-8 shadow-2xl overflow-hidden">
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
            <h2 className="text-3xl font-black text-white">Domine a Internet</h2>
            <p className="mt-3 text-slate-400 text-sm leading-relaxed">
              Ative todos os nossos serviços de marketing de uma vez e coloque seu anúncio no topo do Google e das Redes Sociais.
            </p>

            <div className="mt-8 space-y-3">
              {services.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl bg-white/5 border border-white/5 p-4 transition-all hover:bg-white/10">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg text-purple-400">
                      {s.icon}
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{s.name}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-500">INCLUSO</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/30">
               <div>
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">Oferta Exclusiva</div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-slate-500 line-through text-sm">R$ 198,00</span>
                     <span className="text-3xl font-black text-white">R$ 99,00</span>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase mt-1">50% de Desconto Ativado</div>
               </div>
               <button 
                 onClick={handleStartViralizar}
                 className="group flex items-center gap-2 rounded-xl bg-purple-500 px-6 py-4 font-bold text-white transition-all hover:bg-purple-400 shadow-lg shadow-purple-500/20"
               >
                 Viralizar
                 <Rocket size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
               </button>
            </div>
          </div>
        )}

        {step === "payment" && paypalOrderId && (
          <div className="relative z-10 text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Finalize o Pagamento</h2>
            <p className="text-slate-400 mb-8 text-sm">Use o PayPal para ativar seu pacote Viralizar com segurança.</p>
            
            <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "", currency: "BRL" }}>
              <PayPalButtons 
                style={{ layout: "vertical", shape: "rect" }}
                createOrder={async () => paypalOrderId}
                onApprove={async (data) => {
                  executeBundle(data.orderID);
                }}
              />
            </PayPalScriptProvider>
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
