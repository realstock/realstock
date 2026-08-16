"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Globe, ArrowLeft, Loader2, Image as ImageIcon, Volume2, VolumeX, X, Video } from "lucide-react";
import ViralizarModal from "@/components/ViralizarModal";

// Garante que permalinks relativos do Facebook (ex: /reel/123/) virem URLs completas
function normalizePermalink(permalink?: string | null): string {
  if (!permalink || permalink === '#') return '#';
  if (permalink.startsWith('http')) return permalink;
  return `https://www.facebook.com${permalink}`;
}

export default function FacebookPublisherPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();

  const propertyId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [publishedSessions, setPublishedSessions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [postType, setPostType] = useState<"carousel" | "reels">("carousel");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isViralizarOpen, setIsViralizarOpen] = useState(false);
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
  
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/facebook`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar detalhes.");
      }

      setProperty(data.property);
      setService(data.service);
      setPublishedSessions(data.publishedSessions || []);

      // Sincronização de legado: Se o imóvel já tem ID mas não tem sessão, vamos considerar como publicado
      if (data.property.facebookPostId && (!data.publishedSessions || data.publishedSessions.length === 0)) {
        setPublishedSessions([{ 
          postType: "carousel", 
          validationReport: { permalink: data.property.facebookPermalink || "#" } 
        }]);
      }
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

      const res = await fetch("/api/paypal/create-facebook-order", {
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
    return <LoadingScreen title="Publicação Facebook" subtitle="Sincronizando feed com a Meta Graph API..." />;
  }

  if (isPublishing) {
    return <LoadingScreen title="Publicando no Facebook" subtitle="Processando pagamento e enviando Reels/Carrossel..." />;
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
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              <Globe size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Publicar no Facebook</h1>
              <p className="text-slate-400">
                Seu anúncio será postado automaticamente na Página do Facebook da RealStock!
              </p>
            </div>
          </div>
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

        {!error && !successMsg && property && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visualização de como vai ficar */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit">
              <div className="flex items-center gap-2 font-semibold mb-4">
                <Globe size={20} className="text-blue-400" />
                Preview do Post
              </div>
              
              <div className="aspect-square w-full rounded-xl bg-slate-900 border border-white/10 overflow-hidden relative mb-4">
                 {postType === "reels" ? (
                     (property.customVideoUrl || property.reelsVideoUrl) ? (
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
                               <source src={activeVideoUrl ? `/api/proxy-video?url=${encodeURIComponent(activeVideoUrl)}#t=0.001` : undefined} type={(activeVideoUrl || '').includes('.mp4') ? 'video/mp4' : 'video/webm'} />
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
                       <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900">
                          <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mb-4">
                             <Video size={32} />
                          </div>
                          <h4 className="text-sm font-bold text-white mb-2">Vídeo IA não gerado</h4>
                          <p className="text-[10px] text-slate-400 mb-6">Gere um vídeo profissional com inteligência artificial para publicar no Facebook Reels.</p>
                          <button 
                            onClick={() => setIsViralizarOpen(true)}
                            className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                          >
                            Gerar Vídeo Agora
                          </button>
                       </div>
                     )
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
                        {property.images?.map((_: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`h-1 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1 bg-white/30'}`}
                          />
                        ))}
                      </div>
                   </div>
                 )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-lg font-bold">{property.title}</div>
                {propertyId !== 0 && (
                   <div className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">ID: {propertyId}</div>
                )}
              </div>
              <div className="text-sm text-emerald-400 font-semibold mb-2">
                R$ {Number(property.price).toLocaleString("pt-BR")}
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {property.description || "Nenhuma descrição."}
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                 <h3 className="text-sm font-bold text-white mb-3">Formato da Publicação</h3>
                  <div className="grid grid-cols-2 gap-3">
                     <button 
                       onClick={() => setPostType("carousel")}
                       className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${postType === 'carousel' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
                     >
                        <div className="text-xs font-bold uppercase text-blue-400">Carrossel</div>
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
                           {!(property.customVideoUrl || property.reelsVideoUrl) ? "Gerar vídeo primeiro" : (publishedSessions.find(s => s.postType === "reels") ? "✅ Publicado" : "Vídeo Dinâmico")}
                        </div>
                     </button>
                  </div>
              </div>
            </div>

            {/* Pagamento e Confirmação */}
            <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-6 h-fit">
              <h2 className="text-xl font-semibold mb-2">Valor da publicação</h2>
              <p className="text-slate-400 text-sm mb-6">
                Para que nosso sistema dispare o post automaticamente, aceitamos os métodos de pagamento abaixo. O valor é debitado via PayPal como taxa pelo serviço de automação e tráfego.
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



               {!isPublishing && !paypalOrderId ? (
                 (publishedSessions.find(s => s.postType === postType) || (postType === 'carousel' && property.facebookPostId)) ? (
                    <a 
                      href={normalizePermalink(publishedSessions.find(s => s.postType === postType)?.validationReport?.permalink || property.facebookPermalink)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full block rounded-2xl bg-white/10 border border-white/10 px-6 py-4 text-center font-bold text-white transition hover:bg-white/20"
                    >
                      Ver Post Publicado
                    </a>
                 ) : (
                    <button
                      onClick={startPaypalCheckout}
                      className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-4 text-center font-bold text-white transition hover:opacity-90"
                    >
                      Postar Agora
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
                        const res = await fetch("/api/paypal/capture-facebook-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            orderID: data.orderID,
                            propertyId: propertyId,
                            postType: postType
                          }),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) {
                          throw new Error(result.error || "Falha ao finalizar");
                        }
                        setSuccessMsg(result.message || "Publicação realizada!");
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
            loadData(); // Recarregar para pegar o novo vídeo
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
