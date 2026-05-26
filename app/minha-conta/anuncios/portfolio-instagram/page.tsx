"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Camera, X, Video, Volume2, VolumeX } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import ViralizarModal from "@/components/ViralizarModal";

export default function PortfolioInstagramPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [postType, setPostType] = useState<"carousel" | "reels">("carousel");
  const [publishedSessions, setPublishedSessions] = useState<any[]>([]);
  const [portfolioVideoUrl, setPortfolioVideoUrl] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isViralizarOpen, setIsViralizarOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (portfolioVideoUrl && videoRef.current) {
      videoRef.current.play().catch(e => console.log("Autoplay failed:", e));
    }
  }, [portfolioVideoUrl]);

  useEffect(() => {
    if (selectedIds.length <= 1 || postType === "reels") return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % selectedIds.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedIds, postType]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/minha-conta/anuncios/portfolio-instagram`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar seu portfólio.");
      }

      const propsWithImg = data.properties.filter((p: any) => !p.sold && p.images && p.images.length > 0);
      setProperties(propsWithImg);
      setSelectedIds(propsWithImg.slice(0, 10).map((p: any) => p.id));
      setService(data.service);
      setPublishedSessions(data.instagramPosts || []);
      setPortfolioVideoUrl(data.portfolioVideoUrl || null);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar detalhes do portfólio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  async function startPaypalCheckout() {
    try {
      setPaypalError("");
      setPaypalOrderId(null);

      const res = await fetch("/api/paypal/create-portfolio-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: service.id, postType }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar pagamento.");
      }

      setPaypalOrderId(data.paypal_order_id);
    } catch (err: any) {
      setPaypalError(err.message || "Erro ao preparar o PayPal.");
    }
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  if (loading) {
    return <LoadingScreen title="Gerador de Portfólio" subtitle="Otimizando imagens para o Instagram e Facebook..." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-6">
            <Link 
              href="/minha-conta/anuncios" 
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg shadow-sky-500/5 group"
            >
              <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
              Voltar para Anúncios
            </Link>
          </div>
          <h1 className="mt-4 text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Turbinar Portfólio no Instagram
          </h1>
          <p className="mt-2 text-slate-400">
            Aumente a visibilidade do seu portfólio no Instagram e feche negócio mais rápido!
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
            {successMsg}
             <div className="mt-4">
              <Link href="/minha-conta/anuncios" className="text-emerald-200 underline">
                Voltar aos anúncios
              </Link>
             </div>
          </div>
        )}

        {!error && !successMsg && properties.length > 0 && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit">
              <h2 className="text-xl font-semibold mb-4">Preview do Post</h2>
              
              <div className="aspect-square w-full rounded-xl bg-slate-900 border border-white/10 overflow-hidden relative mb-6">
                {postType === "reels" ? (
                   portfolioVideoUrl ? (
                     <div className="relative w-full h-full">
                        <video 
                          key={portfolioVideoUrl}
                          ref={videoRef}
                          src={portfolioVideoUrl ? `/api/proxy-video?url=${encodeURIComponent(portfolioVideoUrl)}#t=0.001` : undefined} 
                          className="w-full h-full object-cover" 
                          autoPlay 
                          loop 
                          muted={isMuted}
                          playsInline 
                          preload="auto"
                        />
                       <button 
                          onClick={() => setIsMuted(!isMuted)}
                          className="absolute bottom-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
                        >
                          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                     </div>
                   ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900">
                       <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                          <Video size={32} />
                       </div>
                       <h4 className="text-sm font-bold text-white mb-2">Vídeo do Portfólio não gerado</h4>
                       <p className="text-[10px] text-slate-400 mb-6">Crie um vídeo dinâmico com todos os seus imóveis em destaque.</p>
                       <button 
                         onClick={() => setIsViralizarOpen(true)}
                         className="px-6 py-2 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20"
                       >
                         Gerar Vídeo Agora
                       </button>
                    </div>
                   )
                ) : (
                  <div className="w-full h-full relative">
                    {selectedIds.length > 0 ? (
                      properties
                        .filter(p => selectedIds.includes(p.id))
                        .map((prop, idx) => (
                          <div 
                            key={prop.id} 
                            className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                          >
                            <img 
                              src={prop.images[0].imageUrl} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12">
                              <h3 className="text-lg font-bold text-white line-clamp-1 drop-shadow-md">{prop.title}</h3>
                              <p className="text-sm font-bold text-emerald-400 drop-shadow-md">
                                {Number(prop.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                              {(prop.city || prop.state) && (
                                <p className="text-[10px] text-slate-300 mt-1 flex items-center gap-1 drop-shadow-md">
                                  📍 {prop.city}{prop.city && prop.state ? " - " : ""}{prop.state}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-600 text-sm">
                        Selecione as fotos ao lado
                      </div>
                    )}

                    {selectedIds.length > 1 && (
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-20">
                        {selectedIds.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`h-1 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1 bg-white/30'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-6">
                 <h3 className="text-sm font-bold text-white mb-3">Formato da Publicação</h3>
                 <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPostType("carousel")}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${postType === 'carousel' ? 'border-pink-500 bg-pink-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                    >
                       <div className="text-xs font-bold uppercase">Carrossel</div>
                       <div className="text-[10px] text-slate-500">
                          {publishedSessions.find(s => s.postType === "carousel") ? "✅ Publicado" : "Álbum de Fotos"}
                       </div>
                    </button>
                    <button 
                       onClick={() => setPostType("reels")}
                       className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${postType === 'reels' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                     >
                        <div className="text-xs font-bold text-indigo-400 uppercase">Vídeo IA</div>
                        <div className="text-[10px] text-slate-500">
                           {!portfolioVideoUrl ? "Gerar vídeo primeiro" : (publishedSessions.find(s => s.postType === "reels") ? "✅ Publicado" : "Vídeo Dinâmico")}
                        </div>
                     </button>
                 </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-semibold">Seleção de Imóveis</h2>
                 <span className="text-sm font-medium px-2 py-1 bg-white/10 rounded-lg">
                    {selectedIds.length} / 10 máx
                 </span>
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                 {properties.map((prop, idx) => {
                    const isSelected = selectedIds.includes(prop.id);
                    const isDisabled = !isSelected && selectedIds.length >= 10;
                    
                    return (
                      <div 
                        key={prop.id} 
                        onClick={() => {
                           if (isSelected) {
                              setSelectedIds(prev => prev.filter(id => id !== prop.id));
                           } else if (!isDisabled) {
                              setSelectedIds(prev => [...prev, prop.id]);
                           }
                        }}
                        className={`aspect-square rounded-xl bg-slate-900 border-2 overflow-hidden relative cursor-pointer transition ${isSelected ? 'border-pink-500' : 'border-transparent opacity-50 hover:opacity-80'} ${isDisabled ? 'cursor-not-allowed grayscale' : ''}`}
                      >
                          <img src={prop.images[0].imageUrl} alt="Capa" className="w-full h-full object-cover" />
                          {isSelected && (
                             <div className="absolute top-1 right-1 bg-pink-500 text-white rounded-full p-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                             </div>
                          )}
                      </div>
                    );
                 })}
              </div>
            </div>

            <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-orange-500/5 p-6 h-fit">
              <h2 className="text-xl font-semibold mb-2">Valor da publicação</h2>
              <p className="text-slate-400 text-sm mb-6">
                 Aumente a visibilidade do seu portfólio adquirindo os pacotes disponíveis para turbinar seu post no Instagram.
              </p>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                 <div>
                    <div className="font-semibold">{service.name}</div>
                    <div className="text-sm text-slate-400">Serviço digital</div>
                 </div>
                 <div className="text-xl font-bold">
                    R$ {service.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                 </div>
              </div>

              {paypalError && (
                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  {paypalError}
                </div>
              )}

              {isPublishing && (
                  <div className="text-center py-6 text-pink-300 animate-pulse font-semibold">
                      Processando e construindo carrossel, aguarde...
                  </div>
              )}

              {!isPublishing && !paypalOrderId ? (
                <button
                  onClick={startPaypalCheckout}
                  disabled={selectedIds.length === 0}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-4 text-center font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedIds.length === 0 ? 'Selecione as fotos' : 'Turbinar Agora'}
                </button>
              ) : !isPublishing && paypalOrderId ? (
                 <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "BRL", intent: "capture" }}>
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "pay" }}
                    createOrder={async () => paypalOrderId}
                    onApprove={async (data) => {
                      setIsPublishing(true);
                      try {
                         const res = await fetch("/api/paypal/capture-portfolio-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ orderID: data.orderID, selectedPropertyIds: selectedIds, postType }),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) throw new Error(result.error);
                        setSuccessMsg("Carrossel de Portfólio postado com sucesso!");
                      } catch (err: any) {
                        setPaypalError(err.message || "Erro interno.");
                      } finally {
                        setIsPublishing(false);
                      }
                    }}
                    onCancel={() => { setPaypalError(""); setPaypalOrderId(null); }}
                  />
                </PayPalScriptProvider>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <ViralizarModal 
        isOpen={isViralizarOpen}
        onClose={() => {
            setIsViralizarOpen(false);
            loadData(); // Recarregar para pegar o novo vídeo do portfólio
        }}
        propertyId={0} // ID 0 indica modo Portfólio no nosso sistema
        propertyTitle="Meu Portfólio Premium"
        images={properties.slice(0, 10).map(p => ({ imageUrl: p.images[0].imageUrl }))}
      />
    </main>
  );
}
