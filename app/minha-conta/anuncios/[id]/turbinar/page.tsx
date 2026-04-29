"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Rocket, Target, CalendarDays, Wallet, Volume2, VolumeX } from "lucide-react";

export default function TurbinarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform") || "instagram";

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  const [igSessions, setIgSessions] = useState<any[]>([]);
  const [fbSessions, setFbSessions] = useState<any[]>([]);
  const [postType, setPostType] = useState<"carousel" | "reels">("carousel");
  
  // Slider state
  const [dailyBudget, setDailyBudget] = useState<number>(20); // Default R$ 20/day
  const DURATION_DAYS = 5;
  const totalInvestment = dailyBudget * DURATION_DAYS;
  
  let feeAmount = 0;
  if (service?.fee) {
     if (service.fee.type === "PERCENTAGE") {
         feeAmount = (totalInvestment * Number(service.fee.value)) / 100;
     } else {
         feeAmount = Number(service.fee.value);
     }
  }
  const siteCharge = totalInvestment + feeAmount;

  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isBoosting, setIsBoosting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (!property?.images || property.images.length <= 1 || postType === "reels") return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [property, postType]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/minha-conta/anuncios/${id}/turbinar`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar detalhes do anúncio.");
      }

      setProperty(data.property);
      setService(data.service);
      setIgSessions(data.igSessions || []);
      setFbSessions(data.fbSessions || []);

      // Selecionar postType automaticamente se carrossel não estiver disponível
      const availableSessions = platform === "facebook" ? data.fbSessions : data.igSessions;
      if (availableSessions && availableSessions.length > 0) {
          const hasCarousel = availableSessions.some((s: any) => s.postType === "carousel");
          if (!hasCarousel) setPostType("reels");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      loadData();
    }
  }, [status, router]);

  async function startPaypalCheckout() {
    try {
      setPaypalError("");
      setPaypalOrderId(null);

      const res = await fetch("/api/paypal/create-boost-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: id, total_charge: siteCharge, daily_budget: dailyBudget, platform }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar pagamento.");
      }

      setPaypalOrderId(data.paypal_order_id);
    } catch (err: any) {
      setPaypalError(err.message || "Erro interno.");
    }
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  const currentSessions = platform === "facebook" ? fbSessions : igSessions;
  const hasCarousel = currentSessions.some(s => s.postType === "carousel");
  const hasReels = currentSessions.some(s => s.postType === "reels");
  const selectedSession = currentSessions.find(s => s.postType === postType);
  const selectedPermalink = selectedSession?.validationReport ? (selectedSession.validationReport as any).permalink : null;

  if (status === "loading" || loading) {
    return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white"><div className="mx-auto max-w-4xl text-slate-400">Carregando painel de tráfego...</div></main>;
  }

  if (error) {
     return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white"><div className="mx-auto max-w-4xl rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">{error}</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/minha-conta/anuncios"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Voltar aos meus anúncios
          </Link>
          <h1 className="mt-4 text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Turbinar Anúncio
          </h1>
          <p className="mt-3 text-lg text-slate-300">
            {platform === "google" 
              ? "Ative uma campanha inteligente no Google Ads para buscar compradores ativos pesquisando na sua região." 
              : `Transforme sua postagem do ${platform === "facebook" ? "Facebook" : "Instagram"} em um verdadeiro ímã de leads pela Meta Ads.`}
          </p>
        </div>

        {successMsg && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
            <h3 className="font-bold text-xl mb-2">Campanha no ar! 🎉</h3>
            <p>{successMsg}</p>
             <div className="mt-4">
              <Link href="/minha-conta/anuncios" className="text-emerald-200 underline">
                Voltar aos anúncios
              </Link>
             </div>
          </div>
        )}

        {!successMsg && property && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Lado Esquerdo: Preview e Configuração */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit">
                <h2 className="text-xl font-semibold mb-4">Preview do Anúncio</h2>
                
                <div className="aspect-square w-full rounded-xl bg-slate-900 border border-white/10 overflow-hidden relative mb-4">
                  {postType === "reels" && property.reelsVideoUrl ? (
                    <div className="relative w-full h-full">
                      <video 
                        ref={videoRef}
                        key={property.reelsVideoUrl}
                        className="w-full h-full object-cover" 
                        autoPlay 
                        loop 
                        muted={isMuted}
                        playsInline 
                      >
                        <source src={property.reelsVideoUrl} type={property.reelsVideoUrl.endsWith('.mp4') ? 'video/mp4' : 'video/webm'} />
                      </video>
                      <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="absolute bottom-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
                        title={isMuted ? "Ligar som" : "Desligar som"}
                      >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full relative">
                      {property.images?.map((img: any, idx: number) => (
                        <img 
                          key={idx}
                          src={img.imageUrl} 
                          alt={`Slide ${idx}`} 
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`} 
                        />
                      ))}
                      
                      {/* Pontos do Carrossel */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                        {(property.images?.length || 0) > 1 && property.images?.map((_: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`h-1 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1 bg-white/30'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-lg font-bold">{property.title}</div>
                <div className="text-sm text-emerald-400 font-semibold mb-2">
                  R$ {Number(property.price).toLocaleString("pt-BR")}
                </div>
                <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                  {property.description || "Nenhuma descrição."}
                </div>

                {/* Formato */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-white mb-3">Formato do Impulsionamento</h3>
                  <div className="flex p-1 bg-slate-900 rounded-xl border border-white/5 w-fit mb-6">
                    {hasCarousel && (
                        <button 
                            onClick={() => {
                                setPostType("carousel");
                                setPaypalOrderId(null);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${postType === 'carousel' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            Carrossel
                        </button>
                    )}
                    {hasReels && (
                        <button 
                            onClick={() => {
                                setPostType("reels");
                                setPaypalOrderId(null);
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${postType === 'reels' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                        >
                            Reels IA
                        </button>
                    )}
                  </div>
                </div>

                {/* Orçamento (Barra de Rolagem) */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-white mb-1">Orçamento Diário</h3>
                  <p className="text-[10px] text-slate-400 mb-4">Defina quanto investir por dia na plataforma.</p>
                  
                  <div className="mb-2 flex justify-between items-end">
                      <span className="text-[10px] font-bold text-slate-500">R$ 10</span>
                      <div className="text-center">
                          <span className="text-2xl font-black text-indigo-400">R$ {dailyBudget}</span>
                          <span className="text-xs text-slate-400">/dia</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">R$ 150</span>
                  </div>

                  <input 
                    type="range" 
                    min="10" 
                    max="150" 
                    step="5"
                    value={dailyBudget}
                    onChange={(e) => {
                        setDailyBudget(Number(e.target.value));
                        setPaypalOrderId(null);
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Lado Direito: Pagamento e Confirmação */}
            <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-blue-600/5 p-6 h-fit">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Rocket size={20} className="text-indigo-400" />
                Turbinar Agora
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Sua campanha terá duração de **{DURATION_DAYS} dias**. O valor será processado via PayPal e investido diretamente na plataforma de anúncios selecionada.
              </p>

              <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Investimento Direto ({DURATION_DAYS} dias)</span>
                    <span className="font-semibold text-white">R$ {totalInvestment.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Taxa de Serviço {service?.fee?.type === 'PERCENTAGE' ? `(${service.fee.value}%)` : ''}</span>
                    <span className="font-semibold text-white">R$ {feeAmount.toFixed(2)}</span>
                 </div>
                 <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="font-bold">Total a pagar</span>
                    <span className="text-xl font-black text-white">R$ {siteCharge.toFixed(2)}</span>
                 </div>
              </div>

              {paypalError && (
                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  {paypalError}
                </div>
              )}

              {isBoosting && (
                  <div className="text-center py-6 text-indigo-300 animate-pulse font-semibold">
                      Processando pagamento e criando campanha, aguarde...
                  </div>
              )}

              {!isBoosting && !paypalOrderId ? (
                  <button
                    onClick={startPaypalCheckout}
                    className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-4 text-center font-bold text-white transition hover:opacity-90 shadow-lg shadow-indigo-500/20"
                  >
                    Turbinar
                  </button>
              ) : !isBoosting && paypalOrderId ? (
                <PayPalScriptProvider
                  options={{
                    clientId: paypalClientId,
                    currency: "BRL",
                    intent: "capture",
                  }}
                >
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "pay" }}
                    createOrder={async () => paypalOrderId}
                    onApprove={async (data) => {
                      setIsBoosting(true);
                      try {
                        const captureUrl = platform === "google" 
                           ? "/api/paypal/capture-google-order" 
                           : "/api/paypal/capture-boost-order";
                           
                        const res = await fetch(captureUrl, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ 
                            orderID: data.orderID, 
                            propertyId: id, 
                            dailyBudget, 
                            platform, 
                            postType 
                          }),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) throw new Error(result.error || "Falha ao finalizar");
                        setSuccessMsg(`Sua campanha foi criada com sucesso e está em análise pelo ${platform === 'google' ? 'Google' : 'Meta'}. Logo seus leads começarão a chegar!`);
                      } catch (err: any) {
                        setPaypalError(err.message || "Ocorreu um erro ao processar o turbinamento.");
                      } finally {
                        setIsBoosting(false);
                      }
                    }}
                    onCancel={() => {
                      setPaypalError("");
                      setPaypalOrderId(null);
                    }}
                  />
                </PayPalScriptProvider>
              ) : null}

              <div className="mt-6 space-y-4">
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                      <Target className="text-blue-400" size={18}/>
                      <div className="text-[10px]">
                          <div className="text-slate-400 uppercase font-bold">Público</div>
                          <div className="text-white">{property.state || "Brasil"}</div>
                      </div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                      <CalendarDays className="text-purple-400" size={18}/>
                      <div className="text-[10px]">
                          <div className="text-slate-400 uppercase font-bold">Duração</div>
                          <div className="text-white">{DURATION_DAYS} Dias corridos</div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
