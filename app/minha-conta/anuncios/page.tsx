"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useListingType } from "@/context/ListingTypeContext";
import { Camera, CameraOff, CheckCircle2, Rocket, Globe, BarChart3, Building2, Upload, X, Wallet, TrendingUp, History, MapPin, Film, Zap, Users, Volume2, VolumeX, Play } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import VideoCreatorModal from "@/components/VideoCreatorModal";
import ViralizarModal from "@/components/ViralizarModal";
import LoadingScreen from "@/components/LoadingScreen";
import CalendarioReservasModal from "@/components/CalendarioReservasModal";
import confetti from "canvas-confetti";


// Garante que permalinks relativos do Facebook (ex: /reel/123/) virem URLs completas
function normalizePermalink(permalink?: string | null): string {
  if (!permalink || permalink === '#') return '#';
  if (permalink.startsWith('http')) return permalink;
  return `https://www.facebook.com${permalink}`;
}

type PropertyItem = {
  id: number;
  title: string;
  state?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  price: string | number;
  images?: { imageUrl: string }[];
  videos?: any[];
  reelsMusicUrl?: string | null;
  boostedUntil?: string | null;
  googleBoostedUntil?: string | null;
  metaBoostedUntil?: string | null;
  sponsoredUntil?: string | null;
  reelsVideoUrl?: string | null;
  customVideoUrl?: string | null;
  offers?: any[];
  sold?: boolean;
  listingType?: string | null;
  minNights?: number | null;
};

export default function MeusAnunciosPage() {
  const { status } = useSession();
  const router = useRouter();
  const { listingType: listingTypeFilter } = useListingType();

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<any[]>([]);
  const [facebookPosts, setFacebookPosts] = useState<any[]>([]);
  const [portfolioBoostedUntil, setPortfolioBoostedUntil] = useState<string | null>(null);
  const [googlePortfolioBoostedUntil, setGooglePortfolioBoostedUntil] = useState<string | null>(null);
  const [metaPortfolioBoostedUntil, setMetaPortfolioBoostedUntil] = useState<string | null>(null);
  const [portfolioVideoUrl, setPortfolioVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoPaypalOrderId, setLogoPaypalOrderId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [logoActiveUntil, setLogoActiveUntil] = useState<string | null>(null);
  const [investment, setInvestment] = useState<any>(null);
  const [viralizarCredits, setViralizarCredits] = useState<number>(0);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedPropertyForVideo, setSelectedPropertyForVideo] = useState<PropertyItem | null>(null);
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (viewingVideoUrl && videoRef.current) {
      videoRef.current.play().catch(e => {
        console.log("Autoplay failed:", e);
        setPlayerError(`Autoplay: ${e.message || String(e)}`);
      });
    }
  }, [viewingVideoUrl]);

  const [isViralizarOpen, setIsViralizarOpen] = useState(false);
  const [viralizarTarget, setViralizarTarget] = useState<{id: number, title: string} | null>(null);

  const [calendarioProperty, setCalendarioProperty] = useState<{ id: number; title: string } | null>(null);

  const [isMediaCheckOpen, setIsMediaCheckOpen] = useState(false);
  const [pendingVideoProperty, setPendingVideoProperty] = useState<PropertyItem | null>(null);
  const [mediaCheckSource, setMediaCheckSource] = useState<"create" | "viralizar">("create");

  const [tooltipState, setTooltipState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    text: ""
  });

  async function loadProperties() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/minha-conta/anuncios");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar anúncios.");
      }

      setProperties(data.properties || []);
      setInstagramPosts(data.instagramPosts || []);
      setFacebookPosts(data.facebookPosts || []);
      setPortfolioBoostedUntil(data.portfolioBoostedUntil || null);
      setGooglePortfolioBoostedUntil(data.googlePortfolioBoostedUntil || null);
      setMetaPortfolioBoostedUntil(data.metaPortfolioBoostedUntil || null);
      setPortfolioVideoUrl(data.portfolioVideoUrl || null);
      setLogoActiveUntil(data.logoBoostedUntil || null);
      setUserAvatar(data.companyLogo || null);
      setViralizarCredits(data.viralizarCredits || 0);
      setReferralCode(data.referralCode || null);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar anúncios.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSoldStatus(propertyId: number, currentSold: boolean) {
    try {
      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/sold`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Erro ao atualizar status do anúncio.");
        return;
      }

      // Atualiza o estado local imediatamente
      setProperties((prev) =>
        prev.map((p) => (p.id === propertyId ? { ...p, sold: data.sold } : p))
      );

      // Se foi marcado como vendido, solta os confetes!
      if (data.sold) {
        confetti({
          particleCount: 150,
          spread: 85,
          origin: { y: 0.6 }
        });
      }
    } catch (err: any) {
      alert("Erro ao conectar ao servidor para atualizar status.");
    }
  }


  const handleCreateVideoClick = (property: PropertyItem) => {
    const hasVideos = (property.videos || []).length > 0;
    const hasMusic = !!property.reelsMusicUrl;

    if (!hasVideos || !hasMusic) {
      setMediaCheckSource("create");
      setPendingVideoProperty(property);
      setIsMediaCheckOpen(true);
    } else {
      setSelectedPropertyForVideo(property);
      setIsVideoModalOpen(true);
    }
  };

  const handleViralizarClick = (property: PropertyItem) => {
    const hasVideos = (property.videos || []).length > 0;
    const hasMusic = !!property.reelsMusicUrl;
    const hasCustomVideo = !!property.customVideoUrl;

    if (!hasCustomVideo && (!hasVideos || !hasMusic)) {
      setMediaCheckSource("viralizar");
      setPendingVideoProperty(property);
      setIsMediaCheckOpen(true);
    } else {
      setViralizarTarget({ id: property.id, title: property.title });
      setIsViralizarOpen(true);
    }
  };

  // Componente para gerenciar a miniatura com tratamento de erro
  const PropertyThumbnail = ({ property }: { property: PropertyItem }) => {
    const [imageError, setImageError] = useState(false);
    const [videoError, setVideoError] = useState(false);

    // Prioridades: 1. Vídeo próprio pronto ou Vídeo IA pronto, 2. Foto (se não falhar), 3. Vídeo real (se não falhar), 4. Placeholder
    const reelsUrl = (property.customVideoUrl && property.customVideoUrl.trim() !== "") 
      ? property.customVideoUrl 
      : (property.reelsVideoUrl && property.reelsVideoUrl.trim() !== "" ? property.reelsVideoUrl : null);
    const imageUrl = property.images && property.images.length > 0 && property.images[0].imageUrl && property.images[0].imageUrl.trim() !== "" && !imageError ? property.images[0].imageUrl : null;
    const rawVideoUrl = property.videos && property.videos.length > 0 && property.videos[0].videoUrl && property.videos[0].videoUrl.trim() !== "" && !videoError ? property.videos[0].videoUrl : null;

    return (
      <div className="relative h-40 w-52 shrink-0 overflow-hidden rounded-2xl bg-slate-900 shadow-2xl ring-1 ring-white/10">
        {reelsUrl ? (
          <video
            src={`${reelsUrl}#t=1`}
            className="h-full w-full object-cover"
            muted
            playsInline
            onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
            onMouseOut={(e) => {
              const v = e.target as HTMLVideoElement;
              v.pause();
              v.currentTime = 1;
            }}
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={property.title}
            onError={() => {
                console.warn(`Falha ao carregar imagem do imóvel ${property.id}`);
                setImageError(true);
            }}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-110"
          />
        ) : rawVideoUrl ? (
          <video
            src={`${rawVideoUrl}#t=1`}
            className="h-full w-full object-cover"
            muted
            playsInline
            onError={() => {
                console.warn(`Falha ao carregar vídeo do imóvel ${property.id}`);
                setVideoError(true);
            }}
            onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
            onMouseOut={(e) => {
              const v = e.target as HTMLVideoElement;
              v.pause();
              v.currentTime = 1;
            }}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-slate-800 text-slate-600">
            <CameraOff size={24} />
            <span className="mt-2 text-[10px] font-bold uppercase tracking-tighter">Sem Mídia</span>
          </div>
        )}
        
        {(reelsUrl || rawVideoUrl) && (
          <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 p-1.5 backdrop-blur-md flex items-center gap-1">
            <Film size={12} className="text-white" />
            {reelsUrl && <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />}
          </div>
        )}
      </div>
    );
  };

  async function loadInvestment() {
    try {
      const res = await fetch("/api/minha-conta/investimento");
      const data = await res.json();
      if (data.success) setInvestment(data);
    } catch (e) {}
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadProperties();
      loadInvestment();
      
      // Auto-abrir Viralizar se vier do e-mail
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("viralizar") === "true") {
         setViralizarTarget({ id: 0, title: "Meu Portfólio" });
         setIsViralizarOpen(true);
      }
    }
  }, [status]);

  if (loading) {
    return <LoadingScreen title="Meus Anúncios" subtitle="Sincronizando seus imóveis e métricas..." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <Link 
            href="/minha-conta" 
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg shadow-sky-500/5 group"
          >
            <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
            Voltar para o Painel
          </Link>
        </div>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm text-slate-400">Minha conta</div>
            <h1 className="mt-2 text-4xl font-bold">Meus anúncios</h1>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* Botões movidos para dentro da caixa de Portfólio */}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {/* QUARTEL GENERAL DE CONVITES */}
        <div className="mb-8 overflow-hidden rounded-[32px] border border-purple-500/30 bg-slate-900/50 p-8 shadow-2xl relative backdrop-blur-xl">
           <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
           
           <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-6">
                 <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-purple-500/20 text-purple-400 shadow-inner">
                    <Users size={40} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Expanda sua Rede</h2>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm italic">
                       Convide corretores e ganhe **5 créditos de Viralizar** por cada novo cadastro realizado através do seu link.
                    </p>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[140px]">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Saldo Atual</span>
                    <span className="text-3xl font-black text-emerald-400">{viralizarCredits} <span className="text-xs text-slate-400">CUPONS</span></span>
                 </div>

                 <div className="flex-1 lg:flex-none">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Seu Link de Convite</div>
                    <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-2xl p-2 pl-4">
                       <span className="text-xs font-mono text-purple-300 truncate max-w-[200px]">
                          realstock.com.br/cadastro?ref={referralCode}
                       </span>
                       <button 
                         onClick={() => {
                            navigator.clipboard.writeText(`https://realstock.com.br/cadastro?ref=${referralCode}`);
                            alert("Link copiado! Envie para seus amigos no WhatsApp.");
                         }}
                         className="bg-purple-500 hover:bg-purple-400 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
                       >
                          Copiar Link
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Banner de Imobiliária Parceira */}
        <div className="mb-8 overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-600/20 via-slate-900 to-slate-950 p-6 shadow-2xl relative">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400">
                <Building2 size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Você é uma imobiliária?</h2>
                <p className="text-slate-400 text-sm mt-1 max-w-md">
                   Destaque sua marca na página inicial e tenha um portfólio exclusivo para seus clientes. Faça o upload de todos seus anúncios de uma só vez!
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <a
                href="/api/minha-conta/exportar-xml"
                download
                className="group flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/50 bg-emerald-500/20 px-6 py-4 font-bold text-emerald-300 transition-all hover:bg-emerald-500 hover:text-white shadow-lg shadow-emerald-500/10 active:scale-95 whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Baixar XML
              </a>
              <Link
                href="/minha-conta/anuncios/importar"
                className="group flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/50 bg-indigo-500/20 px-6 py-4 font-bold text-indigo-300 transition-all hover:bg-indigo-500 hover:text-white shadow-lg shadow-indigo-500/10 active:scale-95 whitespace-nowrap"
              >
                <Upload size={18} />
                Importar XML
              </Link>
              <button 
                onClick={() => setIsLogoModalOpen(true)}
                className="group flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-6 py-4 font-bold text-white transition-all hover:bg-sky-400 shadow-lg shadow-sky-500/20 active:scale-95 whitespace-nowrap"
              >
                Exibir Logo
                <Rocket size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </button>
            </div>
          </div>
          
          {logoActiveUntil && new Date(logoActiveUntil) > new Date() && (
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 w-fit px-3 py-1 rounded-full border border-emerald-500/20">
               <CheckCircle2 size={14} /> Logo Ativo até {new Date(logoActiveUntil).toLocaleDateString()}
            </div>
          )}
        </div>

        {(() => {
           if (properties.length === 0) return null;

           const filteredPortfolioProps = properties.filter(p =>
             listingTypeFilter === "ALUGUEL_TEMPORADA"
               ? p.listingType === "ALUGUEL_TEMPORADA"
               : p.listingType !== "ALUGUEL_TEMPORADA"
           );

           if (filteredPortfolioProps.length === 0) return null;

           const portfolioSession = instagramPosts.find(p => p.listingId === 0);
           const facebookPortfolioSession = facebookPosts.find(p => p.listingId === 0);
           const isPublishedAny = portfolioSession || facebookPortfolioSession;
           
           const igPermalink = portfolioSession?.validationReport?.permalink;
           const fbPermalink = facebookPortfolioSession?.validationReport?.permalink;

           return (
             <div className={`mb-6 relative overflow-hidden rounded-2xl border ${isPublishedAny ? 'border-purple-500/40 bg-gradient-to-r from-purple-500/10 to-indigo-500/5' : 'border-pink-500/20 bg-gradient-to-r from-pink-500/5 to-orange-500/5'} p-5 flex flex-col gap-4`}>
               {isPublishedAny && (
                 <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-500 to-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                   <Rocket size={14} />
                   Portfólio Publicado
                 </div>
               )}
               
               <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
                 <div className="flex gap-4">
                    <div className="flex flex-col gap-3 w-52 shrink-0">
                      <div className="flex -space-x-4 w-full items-center">
                        {filteredPortfolioProps.filter(p => !p.sold && ((p.images && p.images.length > 0) || (p.videos && p.videos.length > 0))).slice(0, 4).map((p, idx) => {
                          const mediaUrl = p.images?.[0]?.imageUrl || p.videos?.[0]?.videoUrl;
                          const isVideo = !p.images?.[0]?.imageUrl && p.videos?.[0]?.videoUrl;
                          return (
                            <div key={p.id} className="h-16 w-16 md:h-20 md:w-20 flex items-center justify-center overflow-hidden rounded-xl border-2 border-slate-900 bg-slate-800 shadow-md relative z-[10] hover:z-[20] transition-transform hover:scale-105" style={{ zIndex: 10 - idx }}>
                              {isVideo ? (
                                <video src={`${mediaUrl}#t=1`} className="h-full w-full object-cover opacity-80" />
                              ) : mediaUrl ? (
                                <img
                                  src={mediaUrl}
                                  alt={p.title}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://placehold.co/400x400/1e293b/475569?text=M%C3%ADdia";
                                  }}
                                />
                              ) : (
                                <div className="text-slate-600"><Camera size={16} /></div>
                              )}
                            </div>
                          );
                        })}
                        {filteredPortfolioProps.filter(p => !p.sold && ((p.images && p.images.length > 0) || (p.videos && p.videos.length > 0))).length > 4 && (
                          <div className="h-16 w-16 md:h-20 md:w-20 flex items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-xs font-bold shadow-md relative z-[5]" style={{ zIndex: 5 }}>
                            +{filteredPortfolioProps.filter(p => !p.sold && ((p.images && p.images.length > 0) || (p.videos && p.videos.length > 0))).length - 4}
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => {
                          setViralizarTarget({ id: 0, title: "Meu Portfólio" });
                          setIsViralizarOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-black text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <Zap size={14} className="fill-white animate-pulse" /> VIRALIZAR TUDO (50% OFF)
                      </button>
                    </div>

                   <div>
                     <div className={`flex items-center gap-2 font-bold text-lg ${isPublishedAny ? 'text-purple-400' : 'text-pink-400'}`}>
                       {isPublishedAny ? <CheckCircle2 size={20} /> : <Camera size={20} />}
                       {isPublishedAny ? 'Seu portfólio está no ar!' : 'Publique todos os seus anúncios'}
                     </div>
                     <div className="mt-1 text-sm text-slate-400 max-w-sm">
                       {isPublishedAny 
                         ? 'O carrossel com todos os seus anúncios foi agrupado e enviado para suas redes. Você agora pode visualizá-lo ou promover (Turbinar) em toda a rede Meta.'
                         : 'O sistema da RealStock agrupa as melhores fotos dos seus imóveis no formato de álbum (Carrossel) otimizado para o Instagram e Facebook automaticamente.'}
                     </div>
                     
                     {metaPortfolioBoostedUntil && new Date(metaPortfolioBoostedUntil) > new Date() && (
                        <div className="mt-3 inline-flex items-center gap-1 w-fit rounded bg-indigo-500/20 px-2 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                          <Rocket size={14} />
                          Meta Ads: {Math.ceil((new Date(metaPortfolioBoostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias res.
                        </div>
                      )}
                      {googlePortfolioBoostedUntil && new Date(googlePortfolioBoostedUntil) > new Date() && (
                        <div className="mt-2 inline-flex items-center gap-1 w-fit rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          <Rocket size={14} />
                          Google Ads: {Math.ceil((new Date(googlePortfolioBoostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias res.
                        </div>
                      )}
                   </div>
                 </div>

                 <div className="flex-1 min-w-[300px]">
                    {/* Painel de Performance e Marketing */}
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          <TrendingUp size={12} />
                          Marketing & Performance
                        </div>
                        {(isPublishedAny || googlePortfolioBoostedUntil || metaPortfolioBoostedUntil) && (
                          <Link 
                            href={`/minha-conta/anuncios/0/insights`}
                            className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 hover:underline"
                          >
                            <BarChart3 size={12} />
                            VER INSIGHTS
                          </Link>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* 1. POSTAR / VER POST */}
                        <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Globe size={12} className="text-sky-400" />
                            1. Postar / Ver Post
                          </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Link
                                href={`/minha-conta/anuncios/portfolio-instagram`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-pink-500/10 hover:border-pink-500/20 active:scale-95 group"
                              >
                                <img src="/icones/instagram.jpg" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="Instagram" />
                              </Link>
                              <Link
                                href={`/minha-conta/anuncios/portfolio-facebook`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-blue-500/10 hover:border-blue-500/20 active:scale-95 group"
                              >
                                <img src="/icones/facebook.jpeg" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="Facebook" />
                              </Link>
                              <Link
                                href={`/minha-conta/anuncios/portfolio-x`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-slate-500/10 hover:border-slate-500/20 active:scale-95 group"
                              >
                                <img src="/icones/x.png" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="X (Twitter)" />
                              </Link>
                              <Link
                                href={`/minha-conta/anuncios/portfolio-youtube`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-red-500/10 hover:border-red-500/20 active:scale-95 group"
                              >
                                <img src="/icones/youtube.png" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="YouTube Shorts" />
                              </Link>
                            </div>
                        </div>

                        {/* 2. CRIAR VÍDEO (IA) */}
                        <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Film size={12} className="text-emerald-400" />
                            2. Criar Vídeo IA
                          </div>
                          <div className="flex flex-col gap-2 flex-grow justify-end">
                            {portfolioVideoUrl ? (
                              <>
                                <button
                                  onClick={() => setViewingVideoUrl(portfolioVideoUrl)}
                                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2 text-[11px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/10"
                                >
                                  <Film size={13} />
                                  Ver Vídeo IA
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPropertyForVideo({
                                      id: 0,
                                      title: "Meu Portfólio",
                                      city: "RealStock",
                                      state: "Pro",
                                      price: 0,
                                      images: filteredPortfolioProps.filter(p => !p.sold && p.images && p.images.length > 0).map(p => ({
                                          imageUrl: p.images![0].imageUrl, title: p.title, city: p.city || "", state: p.state || ""
                                      })).slice(0, 12)
                                    });
                                    setIsVideoModalOpen(true);
                                  }}
                                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/10 bg-white/5 py-2 text-[10px] font-bold text-slate-400 transition-all hover:bg-white/10 hover:text-white group"
                                >
                                  <Zap size={11} className="group-hover:fill-sky-400 group-hover:text-sky-400 transition-all" />
                                  Recriar Vídeo IA
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedPropertyForVideo({
                                    id: 0,
                                    title: "Meu Portfólio",
                                    city: "RealStock",
                                    state: "Pro",
                                    price: 0,
                                    images: filteredPortfolioProps.filter(p => !p.sold && p.images && p.images.length > 0).map(p => ({
                                        imageUrl: p.images![0].imageUrl, title: p.title, city: p.city || "", state: p.state || ""
                                    })).slice(0, 12)
                                  });
                                  setIsVideoModalOpen(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 py-2 text-[11px] font-bold text-sky-400 transition-all hover:bg-sky-500/10"
                              >
                                <Film size={13} />
                                Criar Vídeo IA
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 3. TURBINAR / IMPULSIONAR */}
                        <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Rocket size={12} className="text-indigo-400 animate-pulse" />
                            <span className="animate-pulse text-indigo-300">3. Turbinar Anúncio</span>
                          </div>
                          <div className="flex flex-col gap-2 flex-grow justify-end">
                            <div className="flex gap-2">
                              <Link 
                                href={`/minha-conta/anuncios/0/turbinar?platform=meta`}
                                className="flex-1 flex items-center justify-center gap-1 text-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 py-2 text-[11px] font-bold text-indigo-300 transition-all hover:bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)] animate-pulse"
                              >
                                <Rocket size={11} />
                                Meta Ads
                              </Link>
                              <Link 
                                href={`/minha-conta/anuncios/0/turbinar?platform=google`}
                                className="flex-1 flex items-center justify-center gap-1 text-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse"
                              >
                                <Rocket size={11} />
                                Google
                              </Link>
                            </div>
                            <button
                              disabled
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-yellow-500/20 py-2 text-[11px] font-black text-yellow-500/50 cursor-not-allowed transition-all"
                            >
                              Patrocínio Global
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
             </div>
           );
         })()}

        {properties.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">
            Você ainda não possui anúncios cadastrados.
          </div>
        ) : (
          <div className="space-y-4">

            {properties.filter(p =>
              listingTypeFilter === "ALUGUEL_TEMPORADA"
                ? p.listingType === "ALUGUEL_TEMPORADA"
                : p.listingType !== "ALUGUEL_TEMPORADA"
            ).length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400 text-sm">
                Nenhum imóvel encontrado para este tipo de anúncio.
              </div>
            )}

            {properties
              .filter(p =>
                listingTypeFilter === "ALUGUEL_TEMPORADA"
                  ? p.listingType === "ALUGUEL_TEMPORADA"
                  : p.listingType !== "ALUGUEL_TEMPORADA"
              )
              .map((property) => {
              const publishedSession = instagramPosts.find(p => p.listingId === property.id);
              const isPublished = !!publishedSession;
              const permalink = publishedSession?.validationReport?.permalink;
              
              return (
              <div
                key={property.id}
                className={`rounded-2xl border transition-all duration-350 ${
                  property.sold 
                    ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-emerald-900/10 to-slate-900/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                    : isPublished 
                      ? 'border-pink-500/40 bg-gradient-to-r from-pink-500/5 to-orange-500/5' 
                      : 'border-white/10 bg-white/5'
                } p-5 relative overflow-hidden`}
                onMouseEnter={(e) => {
                  if (!isPublished && !property.sold) {
                    setTooltipState({
                      visible: true,
                      x: e.clientX,
                      y: e.clientY,
                      text: "✨ vc ainda nao viralizou esse anuncio, clique no botão viralizar e publique ele no instagram, facebook e twitter com apenas um clique e 50% de desconto"
                    });
                  }
                }}
                onMouseMove={(e) => {
                  if (!isPublished && !property.sold) {
                    setTooltipState(prev => ({
                      ...prev,
                      x: e.clientX,
                      y: e.clientY
                    }));
                  }
                }}
                onMouseLeave={() => {
                  setTooltipState(prev => ({
                    ...prev,
                    visible: false
                  }));
                }}
              >
                {property.sold ? (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl shadow-lg flex items-center gap-1.5 uppercase tracking-wider animate-pulse">
                    <CheckCircle2 size={13} />
                    Vendido! 🏡🎉
                  </div>
                ) : isPublished && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-pink-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                    <Camera size={14} />
                    Publicado
                  </div>
                )}
                <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
                  <div className="flex gap-4">
                    <div className="flex flex-col gap-3 w-52 shrink-0">
                      <PropertyThumbnail property={property} />
                      <button 
                        onClick={() => handleViralizarClick(property)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-black text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-95"
                        onMouseEnter={(e) => {
                          if (isPublished) {
                            e.stopPropagation();
                            setTooltipState({
                              visible: true,
                              x: e.clientX,
                              y: e.clientY,
                              text: "✨ Se vc alterou o anúncio, adicionou videos e fotos novas, criou um video ia novo viralize ele novamente"
                            });
                          }
                        }}
                        onMouseMove={(e) => {
                          if (isPublished) {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              x: e.clientX,
                              y: e.clientY
                            }));
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isPublished) {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              visible: false
                            }));
                          }
                        }}
                      >
                        <Zap size={14} className="fill-white animate-pulse" /> {isPublished ? "VIRALIZAR NOVAMENTE" : "VIRALIZAR (50% OFF)"}
                      </button>
                    </div>

                    <div>
                      <div className="text-lg font-semibold">
                        {property.title}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {[property.state, property.city, property.neighborhood]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-emerald-400">
                        R$ {Number(property.price).toLocaleString("pt-BR")} {property.listingType === "ALUGUEL_TEMPORADA" ? "/ diária" : ""}
                      </div>
                      
                      {property.metaBoostedUntil && new Date(property.metaBoostedUntil) > new Date() && (
                        <div className="mt-3 inline-flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                          <Rocket size={14} />
                          Meta Ads: {Math.ceil((new Date(property.metaBoostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias res.
                        </div>
                      )}
                      {property.googleBoostedUntil && new Date(property.googleBoostedUntil) > new Date() && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          <Rocket size={14} />
                          Google Ads: {Math.ceil((new Date(property.googleBoostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias res.
                        </div>
                      )}
                      
                      {property.sponsoredUntil && new Date(property.sponsoredUntil) > new Date() && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded bg-yellow-500/20 px-2 py-1 text-xs font-bold text-yellow-300 border border-yellow-500/30">
                          <Rocket size={14} />
                          Patrocinado válido por mais {Math.ceil((new Date(property.sponsoredUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-[300px]">
                    {/* Botões de Gestão Rápida */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      <Link
                        href={`/imovel/${property.id}`}
                        className="flex-1 min-w-[120px] rounded-xl bg-white px-4 py-2.5 text-center text-sm font-bold text-slate-900 transition-all hover:bg-slate-200 active:scale-95"
                      >
                        Ver Anúncio
                      </Link>
                      <Link
                        href={`/anunciar/${property.id}`}
                        className="flex-1 min-w-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-95"
                      >
                        Editar
                      </Link>
                      {property.listingType === "ALUGUEL_TEMPORADA" ? (
                        <Link
                          href={`/minha-conta/anuncios/${property.id}/calendario`}
                          className={`flex-1 min-w-[120px] rounded-xl border px-4 py-2.5 text-center text-sm font-semibold transition-all active:scale-95 ${
                            property.offers && property.offers.length > 0
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          }`}
                        >
                          Calendário
                        </Link>
                      ) : (
                        <Link
                          href={`/minha-conta/anuncios/${property.id}/ofertas`}
                          className={`flex-1 min-w-[120px] rounded-xl border px-4 py-2.5 text-center text-sm font-semibold transition-all active:scale-95 ${
                            property.offers && property.offers.length > 0
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                              : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                          }`}
                        >
                          Ofertas {property.offers && property.offers.length > 0 && `(${property.offers.length})`}
                        </Link>
                      )}
                      {property.listingType !== "ALUGUEL_TEMPORADA" && (
                        <button
                          onClick={() => toggleSoldStatus(property.id, property.sold || false)}
                          className={`flex-1 min-w-[120px] rounded-xl border px-4 py-2.5 text-center text-sm font-bold transition-all active:scale-95 ${
                            property.sold
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          }`}
                        >
                          {property.sold ? "Reativar Anúncio" : "Marcar Vendido"}
                        </button>
                      )}
                    </div>

                    {/* Painel de Performance e Marketing */}
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          <TrendingUp size={12} />
                          Marketing & Performance
                        </div>
                        {(isPublished || property.googleBoostedUntil || property.metaBoostedUntil) && (
                          <Link 
                            href={`/minha-conta/anuncios/${property.id}/insights`}
                            className="flex items-center gap-1 text-[10px] font-bold text-yellow-500 hover:underline"
                          >
                            <BarChart3 size={12} />
                            VER INSIGHTS
                          </Link>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {/* 1. POSTAR / VER POST */}
                        <div 
                          className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between"
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setTooltipState({
                              visible: true,
                              x: e.clientX,
                              y: e.clientY,
                              text: isPublished 
                                ? "✨ clique nos botões abaixo para conferir suas postagens das redes sociais" 
                                : "✨ Escolha a rede social e faça sua postagem"
                            });
                          }}
                          onMouseMove={(e) => {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              x: e.clientX,
                              y: e.clientY
                            }));
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              visible: false
                            }));
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Globe size={12} className="text-sky-400" />
                            1. Postar / Ver Post
                          </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <Link
                                href={`/minha-conta/anuncios/${property.id}/instagram`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-pink-500/10 hover:border-pink-500/20 active:scale-95 group"
                              >
                                <img src="/icones/instagram.jpg" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="Instagram" />
                              </Link>
                              <Link
                                href={`/minha-conta/anuncios/${property.id}/facebook`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-blue-500/10 hover:border-blue-500/20 active:scale-95 group"
                              >
                                <img src="/icones/facebook.jpeg" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="Facebook" />
                              </Link>
                              <Link
                                href={`/minha-conta/anuncios/${property.id}/x`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-slate-500/10 hover:border-slate-500/20 active:scale-95 group"
                              >
                                <img src="/icones/x.png" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="X (Twitter)" />
                              </Link>
                              <Link
                                href={`/minha-conta/anuncios/${property.id}/youtube`}
                                className="flex items-center justify-center p-2 rounded-xl bg-white/[0.02] border border-white/5 transition-all duration-200 hover:bg-red-500/10 hover:border-red-500/20 active:scale-95 group"
                              >
                                <img src="/icones/youtube.png" className="w-7 h-7 rounded-lg object-cover transition-transform group-hover:scale-110" alt="YouTube Shorts" />
                              </Link>
                            </div>
                        </div>

                        {/* 2. CRIAR VÍDEO (IA) */}
                        <div 
                          className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between"
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            const hasVideos = property.videos && property.videos.length > 0;
                            const hasIaVideo = !!(property.customVideoUrl || property.reelsVideoUrl);

                            let tooltipText = "";
                            if (hasVideos && !hasIaVideo) {
                              tooltipText = "✨ crie seu video para o reel aqui";
                            } else if (!hasVideos) {
                              tooltipText = "✨ adicione videos ao seu anuncio e crie seu video ia";
                            } else if (hasIaVideo) {
                              tooltipText = "✨ veja seu video ou se incluiu os videos posteriormente recrie ele";
                            }

                            setTooltipState({
                              visible: true,
                              x: e.clientX,
                              y: e.clientY,
                              text: tooltipText
                            });
                          }}
                          onMouseMove={(e) => {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              x: e.clientX,
                              y: e.clientY
                            }));
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              visible: false
                            }));
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Film size={12} className="text-emerald-400" />
                            2. Criar Vídeo IA
                          </div>
                          <div className="flex flex-col gap-2 flex-grow justify-end">
                            {property.customVideoUrl || property.reelsVideoUrl ? (
                              <>
                                <button
                                  onClick={() => setViewingVideoUrl((property.customVideoUrl || property.reelsVideoUrl)!)}
                                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2 text-[11px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/10"
                                >
                                  <Film size={13} />
                                  {property.customVideoUrl ? "Ver Vídeo Próprio" : "Ver Vídeo IA"}
                                </button>
                                <button
                                  onClick={() => handleCreateVideoClick(property)}
                                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/10 bg-white/5 py-2 text-[10px] font-bold text-slate-400 transition-all hover:bg-white/10 hover:text-white group"
                                >
                                  <Zap size={11} className="group-hover:fill-sky-400 group-hover:text-sky-400 transition-all" />
                                  Recriar Vídeo IA
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleCreateVideoClick(property)}
                                className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 py-2 text-[11px] font-bold text-sky-400 transition-all hover:bg-sky-500/10"
                              >
                                <Film size={13} />
                                Criar Vídeo IA
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 3. TURBINAR / IMPULSIONAR */}
                        <div 
                          className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col justify-between"
                          onMouseEnter={(e) => {
                            e.stopPropagation();
                            setTooltipState({
                              visible: true,
                              x: e.clientX,
                              y: e.clientY,
                              text: isPublished 
                                ? "✨ Aqui é a cereja do bolo, contrate um pacote para turbinar seu anuncio e alcance milhares de pessoas nas redes sociais" 
                                : "✨ publique seu anuncio nas redes sociais e contrate um pacote para turbinar seu anuncio e alcance milhares de pessoas nas redes sociais"
                            });
                          }}
                          onMouseMove={(e) => {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              x: e.clientX,
                              y: e.clientY
                            }));
                          }}
                          onMouseLeave={(e) => {
                            e.stopPropagation();
                            setTooltipState(prev => ({
                              ...prev,
                              visible: false
                            }));
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                            <Rocket size={12} className="text-indigo-400 animate-pulse" />
                            <span className="animate-pulse text-indigo-300">3. Turbinar Anúncio</span>
                          </div>
                          <div className="flex flex-col gap-2 flex-grow justify-end">
                            <div className="flex gap-2">
                              <Link 
                                href={`/minha-conta/anuncios/${property.id}/turbinar?platform=meta`}
                                className="flex-1 flex items-center justify-center gap-1 text-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 py-2 text-[11px] font-bold text-indigo-300 transition-all hover:bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)] animate-pulse"
                              >
                                <Rocket size={11} />
                                Meta Ads
                              </Link>
                              <Link 
                                href={`/minha-conta/anuncios/${property.id}/turbinar?platform=google`}
                                className="flex-1 flex items-center justify-center gap-1 text-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2 text-[11px] font-bold text-emerald-300 transition-all hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse"
                              >
                                <Rocket size={11} />
                                Google
                              </Link>
                            </div>
                            {!(property.sponsoredUntil && new Date(property.sponsoredUntil) > new Date()) && (
                              <Link
                                href={`/minha-conta/anuncios/${property.id}/patrocinar`}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-500/30 py-2 text-[11px] font-black text-yellow-500 transition-all hover:from-amber-500/30 hover:to-yellow-500/30"
                              >
                                💎 Patrocinar Imóvel
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ÁREA DE INVESTIMENTOS */}
        <div className="mt-12 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-xl">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                 <div className="flex items-center gap-2 text-sky-400 font-bold uppercase tracking-widest text-[10px] mb-2">
                    <TrendingUp size={14} /> Meu Investimento Total
                 </div>
                 <h2 className="text-4xl font-black text-white">
                    R$ {investment?.totalSpent?.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0,00"}
                 </h2>
                 <p className="text-slate-400 mt-2 text-xs">
                    Valor total investido em publicidade e parcerias no RealStock.
                 </p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
                    <Wallet size={28} />
                 </div>
              </div>
           </div>

           <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {investment?.breakdown?.map((item: any) => (
                <div key={item.label} className="rounded-2xl border border-white/5 bg-white/5 p-5 transition-all hover:bg-white/10">
                   <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{item.label}</div>
                   <div className="text-xl font-bold text-white">R$ {item.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                </div>
              ))}
              {(!investment?.breakdown || investment.breakdown.length === 0) && (
                <div className="col-span-full rounded-2xl border border-dashed border-white/10 p-6 text-center text-slate-500 text-sm">
                   Nenhum investimento registrado ainda.
                </div>
              )}
           </div>

           {investment?.transactions?.length > 0 && (
              <div className="mt-12">
                 <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6 underline decoration-sky-500/40 underline-offset-4">
                    <History size={14} /> Histórico Recente de Ativações
                 </div>
                 <div className="space-y-3">
                    {investment.transactions.slice(0, 5).map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 text-xs">
                         <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-200">{t.description}</span>
                            <span className="text-[10px] text-slate-500">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</span>
                         </div>
                         <div className="font-bold text-sky-400">+ R$ {Number(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      </div>
                    ))}
                 </div>
              </div>
           )}
        </div>
      </div>

      {/* MODAL PARA UPLOAD DE LOGO */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-950 p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Configurar sua Marca</h2>
              <button 
                onClick={() => { setIsLogoModalOpen(false); setLogoPreview(null); setSelectedLogoFile(null); }}
                className="text-slate-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <p className="mt-2 text-slate-400 text-sm">
               Seu logo aparecerá na barra lateral da página inicial e levará os clientes direto para seus imóveis.
            </p>

            <div className="mt-8">
               <div className="flex flex-col items-center justify-center">
                  <div className={`relative h-32 w-48 overflow-hidden rounded-2xl border-2 border-dashed transition-colors ${logoPreview ? 'border-sky-500/50 bg-sky-500/5' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    {logoPreview ? (
                      <img src={logoPreview} className="h-full w-full object-contain p-2" alt="Preview Logo" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
                         <Upload size={24} />
                         <span className="text-xs">Clique para selecionar</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedLogoFile(file);
                          setLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="absolute inset-0 cursor-pointer opacity-0" 
                    />
                  </div>
                  {logoPreview && (
                    <button 
                       onClick={() => { setLogoPreview(null); setSelectedLogoFile(null); }}
                       className="mt-2 text-xs text-red-400 underline"
                    >
                       Remover imagem
                    </button>
                  )}
               </div>
            </div>

            {!logoPaypalOrderId ? (
               <button 
                 onClick={async () => {
                   if (!selectedLogoFile) return alert("Selecione um logo primeiro");
                   console.log("Iniciando processo de pagamento do logo...");
                   try {
                     setIsLogoUploading(true);
                     // 1. Criar Ordem PayPal
                     const res = await fetch("/api/paypal/create-logo-order", { method: "POST" });
                     
                     if (!res.ok) {
                        const errorText = await res.text();
                        console.error("Erro na resposta da API:", errorText);
                        throw new Error("Erro ao preparar pagamento. Verifique os logs do servidor.");
                     }

                     const data = await res.json();
                     console.log("Resposta da API de Ordem:", data);

                     if (!data.success) throw new Error(data.error || "Falha desconhecida na API");
                     
                     setLogoPaypalOrderId(data.paypal_order_id);
                   } catch (err: any) {
                     console.error("Erro no fluxo de confirmação:", err);
                     alert("Erro: " + err.message);
                   } finally {
                     setIsLogoUploading(false);
                   }
                 }}
                 disabled={!selectedLogoFile || isLogoUploading}
                 className="mt-8 w-full rounded-2xl bg-white py-4 font-bold text-slate-900 transition-all hover:bg-slate-200 disabled:opacity-50"
               >
                 {isLogoUploading ? "Preparando..." : "Confirmar e Pagar Taxa"}
               </button>
            ) : (
              <div className="mt-8">
                 <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "", currency: "BRL" }}>
                    <PayPalButtons 
                       style={{ layout: "vertical", shape: "rect", label: "paypal" }}
                       createOrder={async () => logoPaypalOrderId}
                       onApprove={async (data) => {
                          try {
                             // 2. Fazer Upload da Imagem para o Servidor (ou transformar em Base64 para teste se não houver Storage)
                             const formData = new FormData();
                             formData.append("file", selectedLogoFile!);
                             formData.append("orderID", data.orderID);

                             const res = await fetch("/api/minha-conta/logo-upload", {
                                method: "POST",
                                body: formData
                             });
                             const result = await res.json();
                             if (!result.success) throw new Error(result.error);

                             alert("Sucesso! Seu logo já está em análise e aparecerá no site em breve.");
                             setIsLogoModalOpen(false);
                             loadProperties();
                          } catch (e: any) {
                             alert("Erro ao finalizar: " + e.message);
                          }
                       }}
                    />
                 </PayPalScriptProvider>
              </div>
            )}
          </div>
        </div>
      )}

      {isVideoModalOpen && selectedPropertyForVideo && (
        <VideoCreatorModal 
          isOpen={isVideoModalOpen}
          onClose={() => setIsVideoModalOpen(false)}
          propertyTitle={selectedPropertyForVideo.title}
          propertyCity={selectedPropertyForVideo.city}
          propertyState={selectedPropertyForVideo.state}
          propertyId={selectedPropertyForVideo.id}
          images={selectedPropertyForVideo.images || []}
          videos={selectedPropertyForVideo.videos || []}
          reelsMusicUrl={selectedPropertyForVideo.reelsMusicUrl}
          onSuccess={(videoUrl) => {
            setProperties(prev => prev.map(p => 
              p.id === selectedPropertyForVideo.id ? { ...p, reelsVideoUrl: videoUrl } : p
            ));
          }}
        />
      )}

      {/* MODAL PARA VER VÍDEO */}
      {viewingVideoUrl && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-sm rounded-[32px] border border-white/20 bg-slate-950 p-1 shadow-2xl overflow-hidden">
             <button 
               onClick={() => {
                 setViewingVideoUrl(null);
                 setPlayerError(null);
               }}
               className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white/70 hover:text-white transition-colors backdrop-blur-md"
             >
               <X size={24} />
             </button>
             
             <div className="aspect-[9/16] w-full overflow-hidden rounded-[28px] bg-slate-900 relative">
                <video 
                  key={viewingVideoUrl}
                  ref={videoRef}
                  onError={(e) => {
                    const mediaError = (e.target as HTMLVideoElement).error;
                    setPlayerError(mediaError ? `MediaError (Code ${mediaError.code}): ${mediaError.message || 'Decoder or format error'}` : "Unknown media error");
                  }}
                  src={viewingVideoUrl ? `/api/proxy-video?url=${encodeURIComponent(viewingVideoUrl)}#t=0.001` : undefined} 
                  className="h-full w-full object-cover" 
                  controls 
                  autoPlay
                  muted={isMuted}
                  playsInline
                  preload="auto"
                />
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 border border-white/10"
                  title={isMuted ? "Ativar som" : "Desativar som"}
                >
                  {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
             </div>
             
             <div className="p-6 text-center">
                <p className="text-xs text-slate-500 font-medium">Este vídeo está incorporado ao seu anúncio e pronto para ser postado no Instagram.</p>
                {playerError && (
                  <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-400">
                    Erro no player: {playerError}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {isViralizarOpen && viralizarTarget && (
        <ViralizarModal 
          isOpen={isViralizarOpen}
          onClose={() => setIsViralizarOpen(false)}
          propertyId={viralizarTarget.id}
          propertyTitle={viralizarTarget.title}
          propertyCity={viralizarTarget.id === 0 ? "RealStock" : properties.find(p => p.id === viralizarTarget.id)?.city}
          propertyState={viralizarTarget.id === 0 ? "Pro" : properties.find(p => p.id === viralizarTarget.id)?.state}
          images={viralizarTarget.id === 0 
            ? properties
                .filter(p => p.images && p.images.length > 0)
                .map(p => ({ 
                  imageUrl: p.images![0].imageUrl, 
                  title: p.title, 
                  city: p.city || "", 
                  state: p.state || "" 
                }))
                .slice(0, 12)
            : (properties.find(p => p.id === viralizarTarget.id)?.images || []).map(img => ({
                ...img,
                title: viralizarTarget.title,
                city: properties.find(p => p.id === viralizarTarget.id)?.city || "",
                state: properties.find(p => p.id === viralizarTarget.id)?.state || ""
              }))
          }
          videos={viralizarTarget.id === 0 
            ? [] 
            : (properties.find(p => p.id === viralizarTarget.id)?.videos || [])}
          reelsMusicUrl={viralizarTarget.id === 0 
            ? null 
            : properties.find(p => p.id === viralizarTarget.id)?.reelsMusicUrl}
          reelsVideoUrl={viralizarTarget.id === 0
            ? null
            : (() => {
                const p = properties.find(prop => prop.id === viralizarTarget.id);
                return p?.customVideoUrl || p?.reelsVideoUrl || null;
              })()}
        />
      )}

      {/* MODAL DE CHECAGEM DE MÍDIA */}
      {isMediaCheckOpen && pendingVideoProperty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-900 p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
              <Film size={32} />
            </div>
            
            <h3 className="mb-2 text-xl font-bold text-white">Qualidade do Vídeo</h3>
            <p className="mb-8 text-sm leading-relaxed text-slate-400">
              O seu anúncio não tem vídeos e áudio para produção do vídeo cadastrados. Deseja incluir mídias reais para um resultado mais profissional ou prefere criar com as fotos atuais?
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href={`/anunciar?edit=${pendingVideoProperty.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-sm font-black text-white transition-all hover:bg-sky-400 hover:scale-[1.02] active:scale-95"
              >
                SIM, QUERO INCLUIR
              </Link>
              <button
                onClick={() => {
                  if (mediaCheckSource === "create") {
                    setSelectedPropertyForVideo(pendingVideoProperty);
                    setIsVideoModalOpen(true);
                  } else {
                    setViralizarTarget({ id: pendingVideoProperty.id, title: pendingVideoProperty.title });
                    setIsViralizarOpen(true);
                  }
                  setIsMediaCheckOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 py-4 text-sm font-black text-slate-300 transition-all hover:bg-white/10 hover:text-white"
              >
                NÃO, USAR FOTOS E MÚSICA PADRÃO
              </button>
              <button
                onClick={() => setIsMediaCheckOpen(false)}
                className="mt-2 text-xs font-bold text-slate-500 hover:text-slate-400 underline underline-offset-4"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {tooltipState.visible && (
        <div 
          className="fixed top-24 right-6 pointer-events-none z-[100] max-w-[320px] rounded-2xl border border-purple-500/40 bg-slate-950/95 p-4 text-xs font-semibold text-purple-300 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top-5 fade-in duration-300"
        >
          <div className="flex gap-3 items-start">
            <span className="text-base animate-pulse">✨</span>
            <div className="space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-purple-400">Dica RealStock</div>
              <p className="leading-relaxed text-slate-200">
                {tooltipState.text.replace("✨ ", "")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CALENDÁRIO DE RESERVAS */}
      {calendarioProperty && (
        <CalendarioReservasModal
          propertyId={calendarioProperty.id}
          propertyTitle={calendarioProperty.title}
          onClose={() => setCalendarioProperty(null)}
        />
      )}
    </main>
  );
}