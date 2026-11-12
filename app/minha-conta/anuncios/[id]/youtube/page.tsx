"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Volume2, VolumeX, X as CloseIcon, Video, Check, Play, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import ViralizarModal from "@/components/ViralizarModal";

export default function YouTubePublisherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const propertyId = Number(id);

  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [publishedSessions, setPublishedSessions] = useState<any[]>([]);
  const [isYoutubeConnected, setIsYoutubeConnected] = useState(false);
  const [channelTitle, setChannelTitle] = useState<string | null>(null);
  const [isEligibleForDirectPublish, setIsEligibleForDirectPublish] = useState(false);
  const [hasMockSession, setHasMockSession] = useState(false);
  const [directPublishing, setDirectPublishing] = useState(false);
  const [authBannerVisible, setAuthBannerVisible] = useState(false);
  const [error, setError] = useState("");
  
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isViralizarOpen, setIsViralizarOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("youtube_connected") === "true") {
        setAuthBannerVisible(true);
      }
    }
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/youtube`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar detalhes.");
      }

      setProperty(data.property);
      setService(data.service);
      setPublishedSessions(data.publishedSessions || []);
      setIsYoutubeConnected(!!data.isYoutubeConnected);
      setChannelTitle(data.channelTitle || null);
      setIsEligibleForDirectPublish(!!data.isEligibleForDirectPublish);
      setHasMockSession(!!data.hasMockSession);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar detalhes do anúncio.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && propertyId) {
      loadData();
    }
  }, [status, propertyId, router]);

  async function handleDirectPublish() {
    if (!isYoutubeConnected) {
      window.location.href = `/api/auth/youtube?returnUrl=/minha-conta/anuncios/${propertyId}/youtube`;
      return;
    }

    try {
      setDirectPublishing(true);
      setError("");
      setSuccessMsg("");

      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/youtube/publish`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao publicar no YouTube Shorts.");
      }

      setSuccessMsg("🎉 Vídeo enviado e publicado com sucesso no seu canal do YouTube Shorts!");
      setPublishedSessions([{ postType: "reels", validationReport: { permalink: data.permalink } }]);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar o vídeo para o YouTube Shorts.");
    } finally {
      setDirectPublishing(false);
    }
  }

  async function startPaypalCheckout() {
    try {
      setPaypalError("");
      setPaypalOrderId(null);

      const res = await fetch("/api/paypal/create-youtube-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: service.id,
          property_id: propertyId,
        }),
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

  if (status === "loading" || loading) {
    return <LoadingScreen title="Publicação YouTube Shorts" subtitle="Conectando com a API do YouTube..." />;
  }

  if (isPublishing || directPublishing) {
    return <LoadingScreen title="Publicando no YouTube Shorts" subtitle="Enviando e processando vídeo no canal do YouTube..." />;
  }

  const isPublished = publishedSessions.length > 0;
  const activeVideoUrl = property?.customVideoUrl || property?.reelsVideoUrl;

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
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-500/20 border border-red-500/20 text-red-500">
              <Play size={20} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 via-slate-300 to-slate-400 bg-clip-text text-transparent">
              Turbine no YouTube Shorts
            </h1>
          </div>
          <p className="mt-3 text-lg text-slate-300">
            Publique seu vídeo de anúncio diretamente no feed de <span className="font-bold text-white">YouTube Shorts</span> e atinja um público massivo!
          </p>
        </div>

        {/* Notificação de canal conectado via OAuth */}
        {authBannerVisible && (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 flex items-center justify-between gap-4 shadow-lg shadow-emerald-500/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Check size={18} />
              </div>
              <p className="text-sm font-semibold">Canal do YouTube conectado com sucesso! Agora você já pode publicar seus vídeos.</p>
            </div>
            <button 
              onClick={() => setAuthBannerVisible(false)}
              className="text-slate-400 hover:text-white transition"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        )}

        {/* Card de Status da Conexão com o YouTube */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className={`h-11 w-11 flex items-center justify-center rounded-xl ${isYoutubeConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {isYoutubeConnected ? <Check size={22} /> : <AlertCircle size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">Canal do YouTube:</span>
                {isYoutubeConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Conectado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Requer Conexão
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {isYoutubeConnected 
                  ? (channelTitle ? `Canal vinculado: ${channelTitle}` : "Canal Google/YouTube autenticado e pronto para envios.")
                  : "Autorize sua conta do YouTube para permitir o envio direto dos vídeos Shorts."}
              </p>
            </div>
          </div>
          <a
            href={`/api/auth/youtube?returnUrl=/minha-conta/anuncios/${propertyId}/youtube`}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
              isYoutubeConnected 
                ? 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white' 
                : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
            }`}
          >
            <Play size={14} />
            {isYoutubeConnected ? "Trocar / Reconectar Canal" : "Conectar Canal do YouTube"}
          </a>
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
                   <ExternalLink size={16} />
                   Ver Shorts no YouTube
                 </a>
               )}
               <Link href="/minha-conta/anuncios" className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10">
                 Voltar aos Anúncios
               </Link>
             </div>
          </div>
        )}

        {!error && !successMsg && property && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visualização de como vai ficar */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-6 h-fit">
              <h2 className="text-xl font-semibold mb-4 text-slate-200">Resumo da Publicação</h2>
              
              <div className="aspect-[9/16] w-full max-w-[280px] mx-auto rounded-xl bg-slate-950 border border-white/5 overflow-hidden relative mb-4">
                  {activeVideoUrl ? (
                    <div className="relative w-full h-full">
                      <video 
                        ref={videoRef}
                        key={activeVideoUrl}
                        className="w-full h-full object-cover" 
                        autoPlay 
                        loop 
                        muted={isMuted}
                        playsInline 
                      >
                        <source src={activeVideoUrl ? `/api/proxy-video?url=${encodeURIComponent(activeVideoUrl)}#t=0.001` : undefined} type={activeVideoUrl.includes('.mp4') ? 'video/mp4' : 'video/webm'} />
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
                   <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-950">
                      <div className="w-16 h-16 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mb-4">
                         <Video size={32} />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-2">Vídeo IA não gerado</h4>
                      <p className="text-[10px] text-slate-400 mb-6">Gere um vídeo profissional com inteligência artificial para postar no YouTube Shorts.</p>
                      <button 
                        onClick={() => setIsViralizarOpen(true)}
                        className="px-6 py-2 bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all shadow-lg"
                      >
                        Gerar Vídeo Agora
                      </button>
                   </div>
                  )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-4">
                <div className="text-lg font-bold">{property.title}</div>
                {propertyId !== 0 && (
                   <div className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">ID: {propertyId}</div>
                )}
              </div>
              <div className="text-sm text-emerald-400 font-semibold mb-2">
                R$ {Number(property.price).toLocaleString("pt-BR")}
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto bg-black/20 p-3 rounded-lg border border-white/5">
                {property.description || "Nenhuma descrição."}
              </div>
            </div>

            {/* Pagamento e Confirmação */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md p-6 h-fit shadow-2xl">
              <h2 className="text-xl font-semibold mb-2">Publicação no Canal</h2>
              
              {isEligibleForDirectPublish ? (
                <div className="mb-6 rounded-xl border border-sky-400/20 bg-sky-400/10 p-4 text-sky-200 text-sm">
                  ✨ <strong>Serviço Liberado:</strong> Este imóvel já possui pacote Viralizar ativo ou já foi liberado para publicação no YouTube Shorts. Não é necessária nova cobrança!
                </div>
              ) : (
                <p className="text-slate-400 text-sm mb-6">
                  Para disparar a publicação no YouTube Shorts de forma totalmente otimizada, aceitamos o pagamento abaixo. O processamento é realizado de forma 100% segura através do PayPal.
                </p>
              )}

              {!isEligibleForDirectPublish && (
                <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                   <div>
                      <div className="font-semibold text-slate-200">{service.name}</div>
                      <div className="text-sm text-slate-400">Serviço de tráfego Shorts</div>
                   </div>
                   <div className="text-xl font-bold text-white">
                      R$ {service.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                </div>
              )}

              {paypalError && (
                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  {paypalError}
                </div>
              )}

              {/* Ações de Publicação */}
              {isPublished ? (
                <div className="space-y-3">
                  <a 
                    href={publishedSessions[0]?.validationReport?.permalink || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 px-6 py-4 text-center font-bold text-emerald-400 transition hover:bg-emerald-500/30"
                  >
                    <ExternalLink size={18} />
                    Ver Shorts Publicado no YouTube
                  </a>

                  {activeVideoUrl && (
                    <button
                      onClick={handleDirectPublish}
                      disabled={directPublishing}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-3.5 text-center font-bold text-slate-300 transition hover:bg-white/10 hover:text-white text-sm"
                    >
                      <RefreshCw size={16} className={directPublishing ? "animate-spin" : ""} />
                      {directPublishing ? "Republicando..." : "Republicar / Atualizar Shorts no Canal"}
                    </button>
                  )}
                </div>
              ) : isEligibleForDirectPublish ? (
                <div className="space-y-4">
                  <button
                    onClick={handleDirectPublish}
                    disabled={!activeVideoUrl || directPublishing}
                    className={`w-full flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-center font-black transition ${
                      activeVideoUrl 
                        ? 'bg-red-600 hover:bg-red-500 text-white shadow-xl shadow-red-600/30 cursor-pointer' 
                        : 'bg-white/10 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Play size={18} />
                    {directPublishing ? "Enviando para o YouTube Shorts..." : "Publicar no YouTube Shorts Agora"}
                  </button>
                  {!isYoutubeConnected && (
                    <p className="text-xs text-amber-300 text-center">
                      * Ao clicar, você será guiado para autorizar o canal antes do upload.
                    </p>
                  )}
                </div>
              ) : !isPublishing && !paypalOrderId ? (
                <button
                  onClick={startPaypalCheckout}
                  disabled={!activeVideoUrl}
                  className={`w-full rounded-2xl px-6 py-4 text-center font-black transition ${activeVideoUrl ? 'bg-white text-slate-950 hover:bg-slate-200 cursor-pointer' : 'bg-white/10 text-slate-500 cursor-not-allowed'}`}
                >
                  Postar no YouTube Shorts Agora
                </button>
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
                        const res = await fetch("/api/paypal/capture-youtube-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            orderID: data.orderID,
                            propertyId: propertyId
                          }),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) {
                          throw new Error(result.error || "Falha ao finalizar");
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
        propertyId={Number(propertyId)}
        propertyTitle={property?.title || ""}
        propertyCity={property?.city}
        propertyState={property?.state}
        images={property?.images || []}
      />
    </main>
  );
}
