"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Camera, X as CloseIcon, Video, Volume2, VolumeX, Check } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import ViralizarModal from "@/components/ViralizarModal";

export default function PortfolioXPage() {
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

      const res = await fetch(`/api/minha-conta/anuncios/portfolio-x`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar seu portfólio.");
      }

      const propsWithImg = data.properties.filter((p: any) => !p.sold && p.images && p.images.length > 0);
      setProperties(propsWithImg);
      setSelectedIds(propsWithImg.slice(0, 10).map((p: any) => p.id));
      setService(data.service);
      setPublishedSessions(data.xPosts || []);
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

      const res = await fetch("/api/paypal/create-portfolio-x-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: service.id }),
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
    return <LoadingScreen title="Gerador de Portfólio X" subtitle="Otimizando imagens para o X (Twitter)..." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(15,23,42,0.6),rgba(0,0,0,1))]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-6">
            <Link 
              href="/minha-conta/anuncios" 
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg shadow-sky-500/5 group"
            >
              <CloseIcon size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
              Voltar para Anúncios
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400 bg-clip-text text-transparent">
              Turbinar Portfólio no X (Twitter)
            </h1>
          </div>
          <p className="mt-2 text-slate-400">
            Aumente a visibilidade do seu portfólio completo no X e feche negócios muito mais rápido!
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-emerald-300 shadow-xl backdrop-blur-md">
             <div className="text-lg font-bold mb-2">🎉 Sucesso!</div>
             <p className="mb-4">{successMsg}</p>
             <div className="flex flex-wrap gap-3">
               {publishedSessions?.[0]?.validationReport?.permalink && (
                 <a 
                   href={publishedSessions[0].validationReport.permalink} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-slate-950 px-4 py-2 text-sm font-bold transition hover:bg-emerald-400"
                 >
                   Ver Portfólio Publicado
                 </a>
               )}
               <Link href="/minha-conta/anuncios" className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10">
                 Voltar aos Anúncios
               </Link>
             </div>
          </div>
        )}

        {!error && !successMsg && properties.length > 0 && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-6 h-fit">
              <h2 className="text-xl font-semibold mb-4 text-slate-200">Preview do Post</h2>
              
              <div className="aspect-square w-full rounded-xl bg-slate-950 border border-white/5 overflow-hidden relative mb-6">
                {postType === "reels" ? (
                   portfolioVideoUrl ? (
                     <div className="relative w-full h-full">
                       <video 
                         ref={(el) => {
                           if (el) {
                             el.muted = true;
                             el.play().catch(e => console.log("Autoplay failed:", e));
                           }
                         }}
                         src={portfolioVideoUrl ? `/api/proxy-video?url=${encodeURIComponent(portfolioVideoUrl)}#t=0.001` : undefined} 
                         className="w-full h-full object-cover" 
                         autoPlay 
                         loop 
                         muted
                         playsInline 
                       />
                       <button 
                          onClick={() => setIsMuted(!isMuted)}
                          className="absolute bottom-4 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
                        >
                          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                     </div>
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950">
                       <Video size={48} className="text-slate-500 mb-4" />
                       <h3 className="text-lg font-bold mb-2">Vídeo de Portfólio não gerado</h3>
                       <p className="text-xs text-slate-400 max-w-[240px] mb-6">
                         Gere um vídeo profissional unificando seus anúncios primeiro.
                       </p>
                       <button 
                         onClick={() => setIsViralizarOpen(true)}
                         className="px-6 py-2 bg-white text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all shadow-lg"
                       >
                         Gerar Vídeo Agora
                       </button>
                     </div>
                   )
                ) : (
                  <div className="w-full h-full relative bg-slate-950 flex items-center justify-center">
                    {selectedIds.map((pid, idx) => {
                      const prop = properties.find(p => p.id === pid);
                      if (!prop || !prop.images?.[0]) return null;
                      return (
                        <img 
                          key={pid}
                          src={prop.images[0].imageUrl} 
                          alt="portfolio preview" 
                          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                        />
                      );
                    })}
                    
                    {/* Indicador de fotos */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-1.5 shadow-lg">
                      <Camera size={10} />
                      {currentImageIndex + 1} / {selectedIds.length}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <div className="text-lg font-bold mb-1 text-slate-200">Portfólio de Imóveis</div>
                <div className="text-xs text-slate-400">
                  Total de {selectedIds.length} imóveis selecionados para o carrossel.
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                 <h3 className="text-sm font-bold text-white mb-3">Formato da Publicação</h3>
                  <div className="grid grid-cols-2 gap-3">
                     <button 
                       onClick={() => setPostType("carousel")}
                       className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${postType === 'carousel' ? 'border-white bg-white/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                     >
                        <div className="text-xs font-bold uppercase text-slate-200">Carrossel</div>
                        <div className="text-[10px] text-slate-500">
                          {publishedSessions.find(s => s.postType === "carousel") ? "✅ Publicado" : "Post Tradicional"}
                        </div>
                     </button>
                     <button 
                       onClick={() => setPostType("reels")}
                       className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${postType === 'reels' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                     >
                        <div className="text-xs font-bold text-indigo-400 uppercase">Vídeo IA</div>
                        <div className="text-[10px] text-slate-500">
                           {!portfolioVideoUrl ? "Gerar vídeo primeiro" : (publishedSessions.find(s => s.postType === "reels") ? "✅ Publicado" : "Post com Vídeo")}
                        </div>
                     </button>
                  </div>
              </div>
            </div>

            {/* Painel de Pagamento */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 h-fit shadow-2xl">
              <h2 className="text-xl font-semibold mb-2">Valor da Publicação</h2>
              <p className="text-slate-400 text-sm mb-6">
                Realize o pagamento para iniciar a postagem automatizada e turbinar a audiência do seu portfólio de imóveis no X (Twitter).
              </p>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                 <div>
                    <div className="font-semibold text-slate-200">{service.name}</div>
                    <div className="text-sm text-slate-400">Serviço de portfólio digital</div>
                 </div>
                 <div className="text-xl font-bold text-white">
                    R$ {service.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                 </div>
              </div>

              {paypalError && (
                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  {paypalError}
                </div>
              )}

              {isPublishing && (
                  <div className="text-center py-6 text-slate-300 animate-pulse font-semibold">
                      Processando pagamento e publicando no X (Twitter)...
                  </div>
              )}

               {!isPublishing && !paypalOrderId ? (
                  publishedSessions.find(s => s.postType === postType) ? (
                    <a 
                      href={publishedSessions.find(s => s.postType === postType)?.validationReport?.permalink || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full block rounded-2xl bg-white/10 border border-white/10 px-6 py-4 text-center font-bold text-white transition hover:bg-white/20"
                    >
                      Ver Portfólio Publicado
                    </a>
                  ) : (
                    <button
                      onClick={startPaypalCheckout}
                      className="w-full rounded-2xl bg-white text-slate-950 px-6 py-4 text-center font-black transition hover:bg-slate-200"
                    >
                      Postar Portfólio no X
                    </button>
                  )
               ) : !isPublishing && paypalOrderId ? (
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
                      setIsPublishing(true);
                      try {
                        const res = await fetch("/api/paypal/capture-portfolio-x-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ orderID: data.orderID }),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) {
                          throw new Error(result.error || "Falha ao finalizar");
                        }
                        setSuccessMsg(result.message || "Publicação realizada!");
                        setPublishedSessions([{ postType: postType, validationReport: { permalink: result.permalink } }]);
                      } catch (err: any) {
                        setPaypalError(err.message || "Ocorreu um erro na publicação.");
                      } finally {
                        setIsPublishing(false);
                      }
                    }}
                    onError={(err) => {
                      console.error("PAYPAL ERROR:", err);
                      setPaypalError("Erro na comunicação com o PayPal.");
                    }}
                    onCancel={() => {
                      setPaypalError("");
                      setPaypalOrderId(null);
                    }}
                  />
                </PayPalScriptProvider>
              ) : null}

              {/* Seletor de Imóveis para o Carrossel */}
              <div className="mt-8">
                 <h3 className="text-sm font-bold text-slate-300 mb-4">Escolha os imóveis do portfólio (máx. 10)</h3>
                 
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {properties.map((p) => {
                       const isSelected = selectedIds.includes(p.id);
                       return (
                          <div 
                            key={p.id}
                            onClick={() => {
                               if (isSelected) {
                                  setSelectedIds(prev => prev.filter(id => id !== p.id));
                               } else {
                                  if (selectedIds.length >= 10) return;
                                  setSelectedIds(prev => [...prev, p.id]);
                                }
                            }}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-white bg-white/5' : 'border-white/5 bg-transparent hover:bg-white/5'}`}
                          >
                             <div className="w-12 h-12 rounded-lg bg-slate-900 border border-white/10 overflow-hidden relative flex-shrink-0">
                                {p.images?.[0] && <img src={p.images[0].imageUrl} className="w-full h-full object-cover" />}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-200 truncate">{p.title}</div>
                                <div className="text-[10px] text-slate-500 truncate">{p.city} - {p.state}</div>
                             </div>
                             <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-white bg-white text-slate-950' : 'border-white/20 bg-transparent'}`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                             </div>
                          </div>
                       );
                    })}
                 </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <ViralizarModal 
        isOpen={isViralizarOpen}
        onClose={() => {
            setIsViralizarOpen(false);
            loadData();
        }}
        propertyId={0}
        propertyTitle="Meu Portfólio Completo"
        propertyCity=""
        propertyState=""
        images={[]}
      />
    </main>
  );
}
