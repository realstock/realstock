"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Rocket, Target, CalendarDays, Wallet, Volume2, VolumeX, X, Globe, Video } from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import ViralizarModal from "@/components/ViralizarModal";

export default function TurbinarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform") || "instagram";
  const [selectedPlatform, setSelectedPlatform] = useState<string>(
    platform === "meta" ? "instagram" : platform
  );

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  const [igSessions, setIgSessions] = useState<any[]>([]);
  const [fbSessions, setFbSessions] = useState<any[]>([]);
  const [postType, setPostType] = useState<"carousel" | "reels">("carousel");
  const [userRole, setUserRole] = useState<string>("USER");
  const [turbinarCredits, setTurbinarCredits] = useState<number>(0);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  
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
  const [isViralizarOpen, setIsViralizarOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (postType === "reels" && videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.log("Autoplay failed:", e));
    }
  }, [postType, property?.reelsVideoUrl]);

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
      const [pageRes, infoRes] = await Promise.all([
        fetch(`/api/minha-conta/anuncios/${id}/turbinar?platform=${platform}`),
        fetch(`/api/minha-conta/turbinar-info`)
      ]);
      
      const data = await pageRes.json();
      const infoData = await infoRes.json();

      if (!pageRes.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar detalhes do anúncio.");
      }

      setProperty(data.property);
      setService(data.service);
      setIgSessions(data.igSessions || []);
      setFbSessions(data.fbSessions || []);
      
      if (infoData.success) {
        setUserRole(infoData.role);
        setTurbinarCredits(infoData.turbinarCredits);
      }

      // Selecionar postType automaticamente se carrossel não estiver disponível
      const availableSessions = selectedPlatform === "facebook" ? data.fbSessions : data.igSessions;
      if (availableSessions && availableSessions.length > 0) {
          const hasCarouselSession = availableSessions.some((s: any) => {
              const type = s.postType?.toLowerCase();
              return type === "carousel" || (type !== "reels" && type !== "video");
          });
          if (!hasCarouselSession) setPostType("reels");
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
        body: JSON.stringify({ property_id: id, total_charge: siteCharge, daily_budget: dailyBudget, platform: selectedPlatform }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar pagamento.");
      }

      setPaypalOrderId(data.paypal_order_id);
    } catch (err: any) {
      setPaypalError(err.message || "Erro de conexão ao iniciar PayPal.");
    }
  }

  const executeTurbinar = async (orderID: string) => {
    setIsBoosting(true);
    setPaypalError("");
    try {
      const captureUrl = selectedPlatform === "google" 
          ? "/api/paypal/capture-google-order" 
          : "/api/paypal/capture-boost-order";
          
      const res = await fetch(captureUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderID, 
          propertyId: id, 
          dailyBudget, 
          platform: selectedPlatform, 
          postType 
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Falha ao finalizar");
      setSuccessMsg(`Sua campanha foi criada com sucesso e está em análise pelo ${selectedPlatform === 'google' ? 'Google' : 'Meta'}. Logo seus leads começarão a chegar!`);
      // Update turbinar credits locally if used
      if (orderID === "CREDIT") {
        setTurbinarCredits(c => Math.max(0, Number(c) - siteCharge));
      }
    } catch (err: any) {
      setPaypalError(err.message || "Ocorreu um erro ao processar o turbinamento.");
    } finally {
      setIsBoosting(false);
    }
  };

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  const currentSessions = selectedPlatform === "facebook" ? fbSessions : (selectedPlatform === "instagram" ? igSessions : []);
  const hasCarousel = property?.images && property.images.length > 0;
  const hasReels = !!property?.reelsVideoUrl;
  
  const selectedSession = currentSessions.find(s => s.postType?.toLowerCase() === postType);
  const selectedPermalink = selectedSession?.validationReport ? (selectedSession.validationReport as any).permalink : null;

  if (status === "loading" || loading) {
    const subtitle = selectedPlatform === "google" 
      ? "Conectando com Google Ads..." 
      : "Conectando com Meta Ads e Instagram...";
    return <LoadingScreen title="Painel de Tráfego" subtitle={subtitle} />;
  }

  if (isBoosting) {
    return (
      <LoadingScreen 
        title="Criando Campanha" 
        subtitle={`Enviando configurações para o ${selectedPlatform === 'google' ? 'Google Ads' : 'Meta Ads'}...`} 
      />
    );
  }

  if (error) {
     return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white"><div className="mx-auto max-w-4xl rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">{error}</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-6">
            <Link 
              href="/minha-conta/anuncios" 
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg group"
            >
              <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
              Voltar para Anúncios
            </Link>
          </div>
          <h1 className="mt-4 text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Turbinar Anúncio
          </h1>
          <p className="mt-3 text-lg text-slate-300">
            {selectedPlatform === "google" 
              ? "Ative uma campanha inteligente no Google Ads para buscar compradores ativos pesquisando na sua região." 
              : `Transforme sua postagem do ${selectedPlatform === "facebook" ? "Facebook" : "Instagram"} em um verdadeiro ímã de leads pela Meta Ads.`}
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
                
                <div className="mb-4">
                  {selectedPlatform === "google" ? (
                    <div className="w-full rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-left">
                       {/* Header: Logo + Business Name */}
                       <div className="flex items-center gap-2 mb-3">
                          <img 
                            src="/images/logo_realstock_dark.png" 
                            alt="Logo" 
                            className="w-7 h-7 rounded-lg object-contain bg-slate-50 p-1 border border-slate-100"
                            onError={(e) => {
                                // Fallback se a imagem não existir
                                (e.target as any).src = "https://www.realstock.com.br/favicon.ico";
                            }}
                          />
                          <div className="flex flex-col">
                             <span className="text-[12px] text-slate-900 font-bold leading-tight">RealStock Oficial</span>
                             <span className="text-[11px] text-slate-500 leading-tight">https://www.realstock.com.br {' > '} imoveis {' > '} {id}</span>
                          </div>
                          <div className="ml-auto text-slate-400">
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                          </div>
                       </div>

                       <h3 className="text-[20px] text-[#1a0dab] font-medium hover:underline cursor-pointer mb-1 leading-tight">
                          {id === '0'
                            ? `RealStock | Confira oportunidades de imóveis em ${[property.city, property.state].filter(Boolean).join(' - ') || 'todo o Brasil'}`
                            : `${property.title} | Oportunidade Exclusiva RealStock`
                          }
                       </h3>
                       
                       <p className="text-sm text-[#4d5156] leading-relaxed mb-3">
                          <span className="font-bold text-[#4d5156]">Anúncio ·</span>{" "}
                          {id === '0'
                            ? "Confira estes imóveis disponíveis na RealStock, acesse o site!"
                            : (property.description || "Confira este excelente imóvel disponível na RealStock. Fotos exclusivas, detalhes completos e contato direto com o anunciante. Acesse agora!")
                          }
                       </p>

                       {/* Callouts (Recursos de Frase de Destaque) */}
                       <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[13px] text-[#4d5156]">
                          <span className="flex items-center gap-1">• Fotos Exclusivas</span>
                          <span className="flex items-center gap-1">• Verificado pela IA</span>
                          <span className="flex items-center gap-1">• Direto com Anunciante</span>
                          <span className="flex items-center gap-1">• Sem Burocracia</span>
                       </div>

                       {/* Sitelinks (Links de Site) */}
                       <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                          <div>
                             <span className="text-[#1a0dab] text-[14px] font-medium hover:underline cursor-pointer block">Ver Fotos em HD</span>
                             <span className="text-[12px] text-[#4d5156]">Explore cada detalhe do imóvel.</span>
                          </div>
                          <div>
                             <span className="text-[#1a0dab] text-[14px] font-medium hover:underline cursor-pointer block">Fazer Proposta Online</span>
                             <span className="text-[12px] text-[#4d5156]">Negocie agora pelo site oficial.</span>
                          </div>
                       </div>

                       {/* CTA Final */}
                       <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-[13px]">
                          <div className="flex items-center gap-2 text-[#1a0dab] font-medium">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8l4 4-4 4M8 12h7"/></svg>
                             Acesse o site e faça sua proposta
                          </div>
                          <div className="text-slate-400">
                             realstock.com.br
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="aspect-square w-full rounded-xl bg-slate-900 border border-white/10 overflow-hidden relative">
                      {postType === "reels" ? (
                        property.reelsVideoUrl ? (
                          <div className="relative w-full h-full">
                            <video 
                              ref={videoRef}
                              key={property.reelsVideoUrl}
                              className="w-full h-full object-cover" 
                              autoPlay 
                              loop 
                              muted
                              playsInline 
                              preload="auto"
                            >
                              <source src={property.reelsVideoUrl ? `/api/proxy-video?url=${encodeURIComponent(property.reelsVideoUrl)}#t=0.001` : undefined} type={property.reelsVideoUrl.includes('.mp4') ? 'video/mp4' : 'video/webm'} />
                            </video>
                            <button 
                              onClick={() => setIsMuted(!isMuted)}
                              className="absolute bottom-16 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70"
                              title={isMuted ? "Ligar som" : "Desligar som"}
                            >
                              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>

                            {/* Botão CTA nativo Instagram Reels */}
                            <div className="absolute bottom-0 left-0 right-0 w-full bg-[#0095f6] py-3 px-4 flex items-center justify-between text-white text-[13px] font-bold cursor-pointer z-40">
                               Saiba mais
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900">
                             <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-4">
                                <Video size={32} />
                             </div>
                             <h4 className="text-sm font-bold text-white mb-2">Vídeo IA não gerado</h4>
                             <p className="text-[10px] text-slate-400 mb-6">Gere um vídeo profissional com inteligência artificial para postar como Reels.</p>
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
                          {property.images?.map((img: any, idx: number) => (
                            <div 
                              key={idx}
                              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
                            >
                              <img 
                                src={img.imageUrl} 
                                alt={`Slide ${idx}`} 
                                className="w-full h-full object-cover" 
                              />
                              {(img.propertyTitle || property.title) && (
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-12 pb-14">
                                  <h3 className="text-lg font-bold text-white line-clamp-1 drop-shadow-md">{img.propertyTitle || property.title}</h3>
                                  {(img.propertyPrice || property.price) && (
                                     <p className="text-sm font-bold text-emerald-400 drop-shadow-md">
                                       {Number(img.propertyPrice || property.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                     </p>
                                  )}
                                  {((img.propertyCity || property.city) || (img.propertyState || property.state)) && (
                                    <p className="text-[10px] text-slate-300 mt-1 flex items-center gap-1 drop-shadow-md">
                                      📍 {img.propertyCity || property.city}{(img.propertyCity || property.city) && (img.propertyState || property.state) ? " - " : ""}{img.propertyState || property.state}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {/* Pontos do Carrossel */}
                          <div className="absolute bottom-16 left-0 right-0 flex justify-center gap-1.5 z-20">
                            {(property.images?.length || 0) > 1 && property.images?.map((_: any, idx: number) => (
                              <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-4 bg-[#0095f6]' : 'w-1.5 bg-white/70 shadow-sm'}`}
                              />
                            ))}
                          </div>

                          {/* Botão CTA nativo Instagram Feed/Carousel */}
                          <div className="absolute bottom-0 left-0 right-0 w-full bg-[#0095f6] py-3 px-4 flex items-center justify-between text-white text-[13px] font-bold cursor-pointer z-40">
                             Saiba mais
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedPlatform !== "google" && (
                  <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-lg font-bold">{property.title}</div>
                    {id !== "0" && (
                       <div className="text-xs font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">ID: {id}</div>
                    )}
                  </div>
                    {id !== "0" && property.price && (
                      <div className="text-sm text-emerald-400 font-semibold mb-2">
                        R$ {Number(property.price).toLocaleString("pt-BR")}
                      </div>
                    )}
                    <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                      {(() => {
                        const title = property.title || "Anúncio";
                        const city = property.city || "";
                        const state = property.state || "";
                        const hashtagsStr = "\n\n#Imóveis #MercadoImobiliário #RealStock #Investimento" + (city ? ` #${city.replace(/\s+/g, "")}` : "") + (state ? ` #${state.replace(/\s+/g, "")}` : "");
                        return `🌟 ${title}\n\nConfira as melhores oportunidades no RealStock!\n\n${city ? `📍 ${city} - ${state}\n\n` : ""}Acesse nosso site para mais detalhes!${id !== "0" ? `\nhttps://www.realstock.com.br/imovel/${id}` : "\nhttps://www.realstock.com.br"}${hashtagsStr}`;
                      })()}
                    </div>


                  </>
                )}

                {/* Formato */}
                <div className="mt-6 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-white mb-3">
                    {selectedPlatform === "google" ? "Destino do Impulsionamento" : "Formato do Impulsionamento"}
                  </h3>
                  
                  {selectedPlatform === "google" ? (
                    <div className="flex p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 w-full mb-6">
                      <span className="text-[11px] text-emerald-300 font-medium">
                        Rede de Pesquisa Google. O tráfego será direcionado diretamente para a página deste imóvel no seu site.
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* Platform Choice Selector (Instagram / Facebook) */}
                      <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-2">1. Selecione a Rede Social</div>
                        <div className="flex p-1 bg-slate-950 rounded-xl border border-white/5 w-fit">
                          <button 
                            onClick={() => {
                              setSelectedPlatform("instagram");
                              setPaypalOrderId(null);
                              // Auto select post type if available
                              const availableSessions = igSessions;
                              if (availableSessions && availableSessions.length > 0) {
                                const hasCarouselSession = availableSessions.some((s: any) => {
                                  const type = s.postType?.toLowerCase();
                                  return type === "carousel" || (type !== "reels" && type !== "video");
                                });
                                setPostType(hasCarouselSession ? "carousel" : "reels");
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${selectedPlatform === 'instagram' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                          >
                            <img src="/icones/instagram.jpg" className="w-3.5 h-3.5 rounded-sm object-cover" alt="" />
                            Instagram
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedPlatform("facebook");
                              setPaypalOrderId(null);
                              // Auto select post type if available
                              const availableSessions = fbSessions;
                              if (availableSessions && availableSessions.length > 0) {
                                const hasCarouselSession = availableSessions.some((s: any) => {
                                  const type = s.postType?.toLowerCase();
                                  return type === "carousel" || (type !== "reels" && type !== "video");
                                });
                                setPostType(hasCarouselSession ? "carousel" : "reels");
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${selectedPlatform === 'facebook' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
                          >
                            <img src="/icones/facebook.jpeg" className="w-3.5 h-3.5 rounded-sm object-cover" alt="" />
                            Facebook
                          </button>
                        </div>
                      </div>

                      {/* Format Choice Selector */}
                      <div className="mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                        <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 mb-2">2. Formato da Publicação</div>
                        <div className="flex p-1 bg-slate-950 rounded-xl border border-white/5 w-fit">
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
                      
                      {selectedPermalink && (
                        <a 
                          href={selectedPermalink} 
                          target="_blank" 
                          className="mt-2 inline-flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-all"
                        >
                          <Globe size={12} /> Ver Post Original
                        </a>
                      )}
                    </>
                  )}
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



              {!isBoosting && (
                <>
                  {/* CAMPO DE CUPOM */}
                  <div className="mb-6 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="CUPOM DE DESCONTO"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 uppercase"
                    />
                    <button 
                      onClick={async () => {
                        if (!couponCode) return;
                        setApplyingCoupon(true);
                        try {
                          const res = await fetch("/api/minha-conta/redeem-coupon", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ code: couponCode, serviceType: "TURBINAR" })
                          });
                          const data = await res.json();
                          if (data.success) {
                            loadData(); // Recarregar saldo
                            setCouponCode("");
                            alert("Cupom aplicado com sucesso! Seu saldo de créditos foi atualizado.");
                          } else {
                            alert(data.error);
                          }
                        } catch(e: any) {
                          alert(e.message);
                        } finally {
                          setApplyingCoupon(false);
                        }
                      }}
                      disabled={applyingCoupon}
                      className="bg-indigo-500 hover:bg-indigo-400 px-6 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                      {applyingCoupon ? "..." : "APLICAR"}
                    </button>
                  </div>

                  {/* SALDO DE CRÉDITOS */}
                  {turbinarCredits > 0 && userRole !== "ADMIN" && (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Saldo de Cupons</div>
                        <div className="text-xl font-black text-white">R$ {Number(turbinarCredits).toFixed(2)}</div>
                      </div>
                      {turbinarCredits >= siteCharge ? (
                        <button 
                          onClick={() => executeTurbinar("CREDIT")}
                          className="bg-emerald-500 hover:bg-emerald-400 px-6 py-3 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all"
                        >
                          PAGAR COM SALDO
                        </button>
                      ) : (
                        <div className="text-[9px] text-slate-500 font-bold uppercase text-right leading-tight max-w-[120px]">
                           Saldo insuficiente para cobrir o total de R$ {siteCharge.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}

                  {userRole === "ADMIN" ? (
                    <button 
                      onClick={() => executeTurbinar("ADMIN_FREE")}
                      className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-4 font-black text-white shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      ATIVAR (GRÁTIS - ADMIN) <Rocket size={20} />
                    </button>
                  ) : !paypalOrderId ? (
                    <button
                      onClick={startPaypalCheckout}
                      className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 px-6 py-4 text-center font-bold text-white transition hover:opacity-90 shadow-lg shadow-indigo-500/20"
                    >
                      {selectedPlatform === "google" ? "Turbinar no Google" : (selectedSession ? "Turbinar Agora" : "Postar e Turbinar")}
                    </button>
                  ) : (
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
                        onApprove={async (data) => executeTurbinar(data.orderID)}
                        onCancel={() => {
                          setPaypalError("");
                          setPaypalOrderId(null);
                        }}
                      />
                    </PayPalScriptProvider>
                  )}
                </>
              )}

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

      <ViralizarModal 
        isOpen={isViralizarOpen}
        onClose={() => {
            setIsViralizarOpen(false);
            loadData(); // Recarregar para pegar o novo vídeo
        }}
        propertyId={Number(id)}
        propertyTitle={property?.title || ""}
        propertyCity={property?.city}
        propertyState={property?.state}
        images={property?.images || []}
      />
    </main>
  );
}
