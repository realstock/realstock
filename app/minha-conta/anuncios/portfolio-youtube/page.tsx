"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { X as CloseIcon, Video, Volume2, VolumeX, Check } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import ViralizarModal from "@/components/ViralizarModal";

export default function PortfolioYoutubePage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSessions, setPublishedSessions] = useState<any[]>([]);
  const [portfolioVideoUrl, setPortfolioVideoUrl] = useState<string | null>(null);
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

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/minha-conta/anuncios/portfolio-youtube`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar seu portfólio do YouTube.");
      }

      setProperties(data.properties || []);
      setService(data.service);
      setPublishedSessions(data.youtubePosts || []);
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

      const res = await fetch("/api/paypal/create-portfolio-youtube-order", {
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
    return <LoadingScreen title="Portfólio YouTube Shorts" subtitle="Carregando dados do canal e do portfólio..." />;
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
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <img src="/icones/youtube.png" className="w-6 h-6 object-cover" alt="" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-200 via-red-400 to-red-600 bg-clip-text text-transparent">
              Postar Portfólio no YouTube Shorts
            </h1>
          </div>
          <p className="mt-2 text-slate-400">
            Aumente a visibilidade do seu portfólio completo no canal oficial do YouTube com vídeos Shorts profissionais!
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
                    Ver Vídeo no YouTube
                  </a>
                )}
                <Link href="/minha-conta/anuncios" className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10">
                  Voltar aos Anúncios
                </Link>
             </div>
          </div>
        )}

        {!error && !successMsg && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-6 h-fit">
              <h2 className="text-xl font-semibold mb-4 text-slate-200">Preview do Vídeo Shorts</h2>
              
              <div className="aspect-[9/16] max-w-[280px] mx-auto rounded-xl bg-slate-950 border border-white/5 overflow-hidden relative mb-6">
                {portfolioVideoUrl ? (
                  <div className="relative w-full h-full">
                    <video 
                      key={portfolioVideoUrl}
                      ref={videoRef}
                      src={`/api/proxy-video?url=${encodeURIComponent(portfolioVideoUrl)}#t=0.001`} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      loop 
                      muted={isMuted}
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
                    <p className="text-xs text-slate-400 max-w-[200px] mb-6">
                      Gere um vídeo profissional unificando seus anúncios primeiro na seção do Míssil Viralizar.
                    </p>
                    <button 
                      onClick={() => setIsViralizarOpen(true)}
                      className="px-6 py-2 bg-white text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all shadow-lg"
                    >
                      Gerar Vídeo Agora
                    </button>
                  </div>
                )}
              </div>

              <div className="mb-4 text-center">
                <div className="text-lg font-bold mb-1 text-slate-200">Portfólio em Vídeo</div>
                <div className="text-xs text-slate-400">
                  Formato Shorts otimizado para a visualização vertical.
                </div>
              </div>
            </div>

            {/* Painel de Pagamento */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 h-fit shadow-2xl">
              <h2 className="text-xl font-semibold mb-2">Valor da Publicação</h2>
              <p className="text-slate-400 text-sm mb-6">
                Realize o pagamento para iniciar a publicação e o upload automatizado do seu portfólio de imóveis no YouTube Shorts oficial da RealStock.
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
                      Processando pagamento e enviando o vídeo para o YouTube...
                  </div>
              )}

               {!isPublishing && !paypalOrderId ? (
                  publishedSessions.length > 0 ? (
                    <a 
                      href={publishedSessions[0].validationReport?.permalink || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full block rounded-2xl bg-white/10 border border-white/10 px-6 py-4 text-center font-bold text-white transition hover:bg-white/20"
                    >
                      Ver Vídeo no YouTube
                    </a>
                  ) : (
                    <button
                      onClick={startPaypalCheckout}
                      disabled={!portfolioVideoUrl}
                      className={`w-full rounded-2xl px-6 py-4 text-center font-black transition ${!portfolioVideoUrl ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-500'}`}
                    >
                      {!portfolioVideoUrl ? "Gere o Vídeo para Habilitar" : "Postar Portfólio no YouTube"}
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
                        const res = await fetch("/api/paypal/capture-portfolio-youtube-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ orderID: data.orderID }),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) {
                          throw new Error(result.error || "Falha ao finalizar publicação");
                        }
                        setSuccessMsg(result.message || "Publicação realizada!");
                        setPublishedSessions([{ postType: "reels", validationReport: { permalink: result.permalink } }]);
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
