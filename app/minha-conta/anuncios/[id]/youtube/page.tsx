"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Volume2, VolumeX, X as CloseIcon, Video, Check, Play } from "lucide-react";
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

  if (isPublishing) {
    return <LoadingScreen title="Publicando no YouTube" subtitle="Processando pagamento e enviando Shorts..." />;
  }

  const isPublished = publishedSessions.length > 0;

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
                   Ver Shorts Publicado
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
                  {property.customVideoUrl || property.reelsVideoUrl ? (
                    <div className="relative w-full h-full">
                      {(() => {
                        const activeVideoUrl = property.customVideoUrl || property.reelsVideoUrl;
                        return (
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
                        );
                      })()}
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
              <h2 className="text-xl font-semibold mb-2">Valor do Serviço</h2>
              <p className="text-slate-400 text-sm mb-6">
                Para disparar a publicação no YouTube Shorts de forma totalmente otimizada, aceitamos o pagamento abaixo. O processamento é realizado de forma 100% segura através do PayPal.
              </p>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                 <div>
                    <div className="font-semibold text-slate-200">{service.name}</div>
                    <div className="text-sm text-slate-400">Serviço de tráfego Shorts</div>
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

               {!isPublishing && !paypalOrderId ? (
                  isPublished ? (
                    <a 
                      href={publishedSessions[0]?.validationReport?.permalink || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full block rounded-2xl bg-white/10 border border-white/10 px-6 py-4 text-center font-bold text-white transition hover:bg-white/20"
                    >
                      Ver Shorts Publicado
                    </a>
                  ) : (
                    <button
                      onClick={startPaypalCheckout}
                      disabled={!property.reelsVideoUrl}
                      className={`w-full rounded-2xl px-6 py-4 text-center font-black transition ${property.reelsVideoUrl ? 'bg-white text-slate-950 hover:bg-slate-200' : 'bg-white/10 text-slate-500 cursor-not-allowed'}`}
                    >
                      Postar no YouTube Shorts Agora
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
