"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Rocket, Globe, BarChart3, Building2, Upload, X } from "lucide-react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { uploadToCloudinary } from "@/lib/cloudinary"; // Assumiu que existe ou usarei base64/api

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoPaypalOrderId, setLogoPaypalOrderId] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [logoActiveUntil, setLogoActiveUntil] = useState<string | null>(null);

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
      setLogoActiveUntil(data.logoBoostedUntil || null);
      setUserAvatar(data.companyLogo || null);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar anúncios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      loadProperties();
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

                 <div className="flex flex-col gap-2">
                   {(isPublishedAny || googlePortfolioBoostedUntil || metaPortfolioBoostedUntil) && (
                     <Link href="/minha-conta/anuncios/0/insights" className="flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/20 transition-colors">
                       <BarChart3 size={16} />
                       Ver Estatísticas / Insights
                     </Link>
                   )}
                   {igPermalink && (
                     <a href={igPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors">
                       <img src="/icones/instagram.jpg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Instagram" />
                       Ver no Instagam
                     </a>
                   )}
                   {fbPermalink && (
                     <a href={fbPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors">
                       <img src="/icones/facebook.jpeg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Facebook" />
                       Ver no Facebook
                     </a>
                   )}
                   
                   <div className="flex gap-2 w-full justify-end">
                     <Link href="/minha-conta/anuncios/portfolio-instagram" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors">
                       <img src="/icones/instagram.jpg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Instagram" />
                       {portfolioSession ? 'Republicar no Insta' : 'Publicar no Insta'}
                     </Link>
                     <Link href="/minha-conta/anuncios/portfolio-facebook" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors">
                       <img src="/icones/facebook.jpeg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Facebook" />
                       {facebookPortfolioSession ? 'Republicar no Face' : 'Publicar no Face'}
                     </Link>
                   </div>
                   
                   
                   <div className="flex w-full gap-2 mt-2 flex-wrap sm:flex-nowrap">
                       {(portfolioSession || facebookPortfolioSession) && !(metaPortfolioBoostedUntil && new Date(metaPortfolioBoostedUntil) > new Date()) && (
                         <Link href={`/minha-conta/anuncios/0/turbinar?platform=meta`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-indigo-300 hover:from-blue-500/20 hover:to-purple-500/20 transition-colors shadow-lg shadow-indigo-500/5">
                           <Rocket size={16} />
                           Turbinar Meta Ads
                         </Link>
                       )}
                      {!(googlePortfolioBoostedUntil && new Date(googlePortfolioBoostedUntil) > new Date()) && (
                        <Link href={`/minha-conta/anuncios/0/turbinar?platform=google`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-300 hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors shadow-lg shadow-emerald-500/5">
                          <Rocket size={16} />
                          Google Ads
                        </Link>
                      )}
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

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/anunciar/${property.id}`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                    >
                      Editar anúncio
                    </Link>

                    <Link
                      href={`/imovel/${property.id}`}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                    >
                      Ver anúncio
                    </Link>

                    <Link
                      href={`/minha-conta/anuncios/${property.id}/ofertas`}
                      className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
                        property.offers && property.offers.length > 0
                          ? "border-emerald-500 bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500"
                          : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {property.offers && property.offers.length > 0 
                        ? `Gerenciar ofertas (${property.offers.length})` 
                        : "Gerenciar ofertas"}
                    </Link>

                    {!(property.sponsoredUntil && new Date(property.sponsoredUntil) > new Date()) && (
                      <Link
                        href={`/minha-conta/anuncios/${property.id}/patrocinar`}
                        className="rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-3 text-sm font-bold text-slate-900 border border-yellow-400/50 hover:from-yellow-400 hover:to-amber-400 transition-colors shadow-lg shadow-yellow-500/20"
                      >
                        💎 Patrocinar
                      </Link>
                    )}

                    <div className="flex flex-col gap-2 mt-4">
                      {/* STATS BUTTON */}
                      {(isPublished || property.googleBoostedUntil || property.metaBoostedUntil) && (
                        <Link 
                          href={`/minha-conta/anuncios/${property.id}/insights`} 
                          className="flex w-full items-center justify-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/5 px-4 py-4 text-base font-black text-yellow-500 hover:bg-yellow-500/10 transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/5 mb-2"
                        >
                          <BarChart3 size={18} />
                          Ver Estatísticas Completas
                        </Link>
                      )}

                      {/* INSTAGRAM GROUP */}
                      <div className="flex gap-2">
                        <Link
                          href={`/minha-conta/anuncios/${property.id}/instagram`}
                          className="flex flex-[2] justify-center items-center gap-3 rounded-2xl border border-pink-500/30 bg-pink-600/10 px-4 py-4 text-base font-bold text-pink-400 hover:bg-pink-600/20 transition-all active:scale-[0.98]"
                        >
                          <img src="/icones/instagram.jpg" className="w-6 h-6 rounded-lg object-cover flex-shrink-0" alt="Instagram" />
                          {isPublished ? 'Republicar no Insta' : 'Publicar no Insta'}
                        </Link>
                        {isPublished && permalink && (
                          <a 
                            href={permalink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-4 text-base font-medium text-pink-300 hover:bg-white/10 transition-all"
                          >
                             Ver Post
                          </a>
                        )}
                      </div>
                      
                      {/* FACEBOOK BUTTON */}
                      <div className="flex gap-2">
                        <Link
                          href={`/minha-conta/anuncios/${property.id}/facebook`}
                          className="flex flex-1 justify-center items-center gap-3 rounded-2xl border border-blue-500/30 bg-blue-600/10 px-4 py-4 text-base font-bold text-blue-400 hover:bg-blue-600/20 transition-all active:scale-[0.98]"
                        >
                          <img src="/icones/facebook.jpeg" className="w-6 h-6 rounded-lg object-cover flex-shrink-0" alt="Facebook" />
                          {facebookPosts.find(p => p.listingId === property.id) ? 'Republicar no Face' : 'Publicar no Face'}
                        </Link>
                        {facebookPosts.find(p => p.listingId === property.id)?.validationReport?.permalink && (
                          <a 
                            href={facebookPosts.find(p => p.listingId === property.id)?.validationReport?.permalink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-6 py-4 text-base font-medium text-blue-300 hover:bg-white/10 transition-all"
                          >
                             Ver Post
                          </a>
                        )}
                      </div>

                      {/* ADS GROUP */}
                      <div className="flex gap-2 pt-2">
                        <Link 
                          href={`/minha-conta/anuncios/${property.id}/turbinar?platform=meta`} 
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-4 text-base font-bold text-indigo-300 hover:bg-indigo-500/20 transition-all active:scale-[0.98]"
                        >
                           <Rocket size={18} />
                           Meta Ads
                        </Link>
                        
                        <Link 
                          href={`/minha-conta/anuncios/${property.id}/turbinar?platform=google`} 
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-base font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all active:scale-[0.98]"
                        >
                           <Rocket size={18} />
                           Google Ads
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
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
                   try {
                     setIsLogoUploading(true);
                     // 1. Criar Ordem PayPal
                     const res = await fetch("/api/paypal/create-logo-order", { method: "POST" });
                     const data = await res.json();
                     if (!data.success) throw new Error(data.error);
                     setLogoPaypalOrderId(data.paypal_order_id);
                   } catch (err: any) {
                     alert(err.message);
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
    </main>
  );
}