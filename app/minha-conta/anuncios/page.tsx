"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Rocket, Globe, BarChart3, Building2, Upload, X, Wallet, TrendingUp, History, MapPin, Film } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import VideoCreatorModal from "@/components/VideoCreatorModal";

type PropertyItem = {
  id: number;
  title: string;
  state?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  price: string | number;
  images?: { imageUrl: string }[];
  boostedUntil?: string | null;
  googleBoostedUntil?: string | null;
  metaBoostedUntil?: string | null;
  sponsoredUntil?: string | null;
  reelsVideoUrl?: string | null;
  offers?: any[];
};

export default function MeusAnunciosPage() {
  const { status } = useSession();
  const router = useRouter();

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

  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [selectedPropertyForVideo, setSelectedPropertyForVideo] = useState<PropertyItem | null>(null);
  const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || "Erro ao carregar anúncios.");
    } finally {
      setLoading(false);
    }
  }

  async function loadInvestment() {
    try {
      const res = await fetch("/api/minha-conta/investimento");
      const data = await res.json();
      if (data.success) setInvestment(data);
    } catch (e) {}
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      loadProperties();
      loadInvestment();
    }
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl text-slate-400">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
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
                   Destaque sua marca na página inicial e tenha um portfólio exclusivo para seus clientes.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsLogoModalOpen(true)}
              className="group flex items-center gap-2 rounded-2xl bg-sky-500 px-6 py-4 font-bold text-white transition-all hover:bg-sky-400 shadow-lg shadow-sky-500/20 active:scale-95"
            >
              Exibir meu Logo no Site
              <Rocket size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </button>
          </div>
          
          {logoActiveUntil && new Date(logoActiveUntil) > new Date() && (
            <div className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 w-fit px-3 py-1 rounded-full border border-emerald-500/20">
               <CheckCircle2 size={14} /> Logo Ativo até {new Date(logoActiveUntil).toLocaleDateString()}
            </div>
          )}
        </div>

        {(() => {
           if (properties.length === 0) return null;

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
                 <div className="flex flex-col md:flex-row gap-4">
                   <div className="flex -space-x-4 w-fit">
                     {properties.filter(p => p.images && p.images.length > 0).slice(0, 4).map((p, idx) => (
                       <div key={p.id} className="h-24 w-24 md:w-32 overflow-hidden rounded-xl border-2 border-slate-900 bg-slate-900 shadow-md relative z-[10] hover:z-[20] transition-transform hover:scale-105" style={{ zIndex: 10 - idx }}>
                         <img
                           src={p.images?.[0]?.imageUrl}
                           alt={p.title}
                           className="h-full w-full object-cover"
                         />
                       </div>
                     ))}
                     {properties.filter(p => p.images && p.images.length > 0).length > 4 && (
                       <div className="h-24 w-24 md:w-32 flex items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-sm font-bold shadow-md relative z-[5]" style={{ zIndex: 5 }}>
                         +{properties.filter(p => p.images && p.images.length > 0).length - 4}
                       </div>
                     )}
                   </div>

                   <div className="flex flex-col justify-center">
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

                      <div className="flex flex-col gap-3 min-w-[300px]">
                    {/* Ações de Visualização e Insights */}
                    <div className="flex flex-wrap gap-2">
                      {(isPublishedAny || googlePortfolioBoostedUntil || metaPortfolioBoostedUntil) && (
                        <Link href="/minha-conta/anuncios/0/insights" className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-4 py-2.5 text-xs font-bold text-yellow-500 transition-all hover:bg-yellow-500/20">
                          <BarChart3 size={14} />
                          Ver Insights
                        </Link>
                      )}
                      {igPermalink && (
                        <a href={igPermalink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl bg-pink-500/10 border border-pink-500/20 px-4 py-2.5 text-xs font-bold text-pink-400 transition-all hover:bg-pink-500/20">
                          <img src="/icones/instagram.jpg" className="w-4 h-4 rounded-sm object-cover" alt="" />
                          Ver Insta
                        </a>
                      )}
                      {fbPermalink && (
                        <a href={fbPermalink} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-2.5 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/20">
                          <img src="/icones/facebook.jpeg" className="w-4 h-4 rounded-sm object-cover" alt="" />
                          Ver Face
                        </a>
                      )}
                    </div>
                    
                    {/* Painel de Publicação e Impulsionamento */}
                    <div className="rounded-2xl bg-white/5 border border-white/5 p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Publicação</div>
                          <div className="flex gap-2">
                            <Link href="/minha-conta/anuncios/portfolio-instagram" className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-white transition-all hover:bg-white/10">
                              Instagram
                            </Link>
                            <Link href="/minha-conta/anuncios/portfolio-facebook" className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-white transition-all hover:bg-white/10">
                              Facebook
                            </Link>
                          </div>
                          {portfolioVideoUrl ? (
                            <button
                              onClick={() => setViewingVideoUrl(portfolioVideoUrl)}
                              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2 text-[11px] font-bold text-emerald-400 transition-all hover:bg-emerald-500/10"
                            >
                              <Film size={12} /> Ver Vídeo do Portfólio (IA)
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedPropertyForVideo({
                                  id: 0,
                                  title: "Meu Portfólio",
                                  city: "RealStock",
                                  state: "Pro",
                                  price: 0,
                                  images: properties
                                    .filter(p => p.images && p.images.length > 0)
                                    .map(p => ({
                                      imageUrl: p.images![0].imageUrl,
                                      title: p.title,
                                      city: p.city || "",
                                      state: p.state || ""
                                    })) // Mapeia imagem com metadados do imóvel
                                    .slice(0, 12) // Máximo 12 imóveis para o vídeo do portfólio
                                });
                                setIsVideoModalOpen(true);
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 py-2 text-[11px] font-bold text-sky-400 transition-all hover:bg-sky-500/10"
                            >
                              <Film size={12} /> Criar Vídeo do Portfólio (IA)
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Impulsionamento</div>
                          <div className="flex gap-2">
                            <Link href={`/minha-conta/anuncios/0/turbinar?platform=meta`} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 py-2 text-[11px] font-bold text-indigo-300 transition-all hover:bg-indigo-500/10">
                              <Rocket size={12} /> Meta
                            </Link>
                            <Link href={`/minha-conta/anuncios/0/turbinar?platform=google`} className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2 text-[11px] font-bold text-emerald-300 transition-all hover:bg-emerald-500/10">
                              <Rocket size={12} /> Google
                            </Link>
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
            {properties.map((property) => {
              const publishedSession = instagramPosts.find(p => p.listingId === property.id);
              const isPublished = !!publishedSession;
              const permalink = publishedSession?.validationReport?.permalink;
              
              return (
              <div
                key={property.id}
                className={`rounded-2xl border ${isPublished ? 'border-pink-500/40 bg-gradient-to-r from-pink-500/5 to-orange-500/5' : 'border-white/10 bg-white/5'} p-5 relative overflow-hidden`}
              >
                {isPublished && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-pink-500 to-orange-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
                    <Camera size={14} />
                    Publicado
                  </div>
                )}
                <div className="flex flex-wrap items-start justify-between gap-4 mt-2">
                  <div className="flex gap-4">
                    <div className="h-24 w-32 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                      {property.images?.[0]?.imageUrl ? (
                        <img
                          src={property.images[0].imageUrl}
                          alt={property.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                          Sem foto
                        </div>
                      )}
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
                        R$ {Number(property.price).toLocaleString("pt-BR")}
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Redes Sociais */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Link
                              href={`/minha-conta/anuncios/${property.id}/instagram`}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/5 py-2.5 text-xs font-bold text-pink-400 transition-all hover:bg-pink-500/10"
                            >
                              <img src="/icones/instagram.jpg" className="w-4 h-4 rounded-sm object-cover" alt="" />
                              Insta
                            </Link>
                            <Link
                              href={`/minha-conta/anuncios/${property.id}/facebook`}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 py-2.5 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/10"
                            >
                              <img src="/icones/facebook.jpeg" className="w-4 h-4 rounded-sm object-cover" alt="" />
                              Face
                            </Link>
                          </div>
                          
                          {property.reelsVideoUrl ? (
                            <button
                              onClick={() => setViewingVideoUrl(property.reelsVideoUrl!)}
                              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2.5 text-xs font-bold text-emerald-400 transition-all hover:bg-emerald-500/10"
                            >
                              <Film size={14} />
                              Ver Vídeo IA
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedPropertyForVideo(property);
                                setIsVideoModalOpen(true);
                              }}
                              className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/5 py-2.5 text-xs font-bold text-sky-400 transition-all hover:bg-sky-500/10"
                            >
                              <Film size={14} />
                              Criar Vídeo IA
                            </button>
                          )}
                        </div>

                        {/* Impulsionamento */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Link 
                              href={`/minha-conta/anuncios/${property.id}/turbinar?platform=meta`}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 py-2.5 text-xs font-bold text-indigo-300 transition-all hover:bg-indigo-500/10"
                            >
                              <Rocket size={14} />
                              Meta Ads
                            </Link>
                            <Link 
                              href={`/minha-conta/anuncios/${property.id}/turbinar?platform=google`}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-2.5 text-xs font-bold text-emerald-300 transition-all hover:bg-emerald-500/10"
                            >
                              <Rocket size={14} />
                              Google
                            </Link>
                          </div>

                          {!(property.sponsoredUntil && new Date(property.sponsoredUntil) > new Date()) && (
                            <Link
                              href={`/minha-conta/anuncios/${property.id}/patrocinar`}
                              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-500/30 py-2.5 text-xs font-black text-yellow-500 transition-all hover:from-amber-500/30 hover:to-yellow-500/30"
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
            )})}
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
               onClick={() => setViewingVideoUrl(null)}
               className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white/70 hover:text-white transition-colors backdrop-blur-md"
             >
               <X size={24} />
             </button>
             
             <div className="aspect-[9/16] w-full overflow-hidden rounded-[28px] bg-slate-900">
                <video 
                  key={viewingVideoUrl}
                  src={viewingVideoUrl} 
                  className="h-full w-full object-cover" 
                  controls 
                  autoPlay
                  playsInline
                />
             </div>
             
             <div className="p-6 text-center">
                <p className="text-xs text-slate-500 font-medium">Este vídeo está incorporado ao seu anúncio e pronto para ser postado no Instagram.</p>
             </div>
          </div>
        </div>
      )}
    </main>
  );
}