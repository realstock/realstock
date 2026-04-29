"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Volume2, VolumeX } from "lucide-react";

export default function InstagramPublisherPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();

  const propertyId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [publishedSessions, setPublishedSessions] = useState<any[]>([]);
  const [error, setError] = useState("");
  
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [postType, setPostType] = useState<"carousel" | "reels">("carousel");
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

      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/instagram`);
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

      const res = await fetch("/api/paypal/create-instagram-order", {
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
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl text-slate-400">Carregando...</div>
      </main>
    );
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
            Turbine seu Anúncio
          </h1>
          <p className="mt-3 text-lg text-slate-300">
            Aumente a visibilidade do seu anúncio adquirindo os pacotes disponíveis para turbinar seu post no <span className="font-bold text-pink-400">Instagram</span>, <span className="font-bold text-blue-400">Facebook</span> e <span className="font-bold text-emerald-400">Google Ads</span> e feche negócio mais rápido!
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

        {!error && !successMsg && property && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visualização de como vai ficar */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit">
              <h2 className="text-xl font-semibold mb-4">Resumo do anúncio</h2>
              
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

              <div className="text-lg font-bold">{property.title}</div>
              <div className="text-sm text-emerald-400 font-semibold mb-2">
                R$ {Number(property.price).toLocaleString("pt-BR")}
              </div>
              <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {property.description || "Nenhuma descrição."}
              </div>

              {property.reelsVideoUrl && (
                <div className="mt-6 border-t border-white/10 pt-4">
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
                          <div className="text-xs font-bold text-indigo-400 uppercase">Reels IA</div>
                          <div className="text-[10px] text-slate-500">
                             {publishedSessions.find(s => s.postType === "reels") ? "✅ Publicado" : "Vídeo Dinâmico"}
                          </div>
                       </button>
                    </div>
                </div>
              )}
            </div>

            {/* Pagamento e Confirmação */}
            <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-orange-500/5 p-6 h-fit">
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

              {isPublishing && (
                  <div className="text-center py-6 text-pink-300 animate-pulse font-semibold">
                      Processando pagamento e publicando no Instagram, aguarde...
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
                        const res = await fetch("/api/paypal/capture-instagram-order", {
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
    </main>
  );
}
