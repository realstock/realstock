"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Rocket, Globe } from "lucide-react";

type PropertyItem = {
  id: number;
  title: string;
  state?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  price: string | number;
  images?: { imageUrl: string }[];
  boostedUntil?: string | null;
};

export default function MeusAnunciosPage() {
  const { status } = useSession();
  const router = useRouter();

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<any[]>([]);
  const [facebookPosts, setFacebookPosts] = useState<any[]>([]);
  const [portfolioBoostedUntil, setPortfolioBoostedUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                     
                     {portfolioBoostedUntil && new Date(portfolioBoostedUntil) > new Date() && (
                       <div className="mt-3 inline-flex items-center gap-1 w-fit rounded bg-indigo-500/20 px-2 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                         <Rocket size={14} />
                         Turbinado por mais {Math.ceil((new Date(portfolioBoostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="flex flex-col gap-2">
                   {igPermalink && (
                     <a href={igPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors">
                       <Camera size={16} />
                       Ver no Instagam
                     </a>
                   )}
                   {fbPermalink && (
                     <a href={fbPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors">
                       <Globe size={16} />
                       Ver no Facebook
                     </a>
                   )}
                   
                   <div className="flex gap-2 w-full justify-end">
                     <Link href="/minha-conta/anuncios/portfolio-instagram" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors">
                       <Camera size={16} />
                       {portfolioSession ? 'Republicar no Insta' : 'Publicar no Insta'}
                     </Link>
                     <Link href="/minha-conta/anuncios/portfolio-facebook" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors">
                       <Globe size={16} />
                       {facebookPortfolioSession ? 'Republicar no Face' : 'Publicar no Face'}
                     </Link>
                   </div>
                   
                   
                   <div className="flex w-full gap-2 mt-2">
                     {portfolioSession && (
                       <Link href={`/minha-conta/anuncios/0/turbinar?platform=instagram`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-300 hover:from-purple-500/20 hover:to-indigo-500/20 transition-colors shadow-lg shadow-indigo-500/5">
                         <Rocket size={16} />
                         Turbinar Insta
                       </Link>
                     )}
                     {facebookPortfolioSession && (
                       <Link href={`/minha-conta/anuncios/0/turbinar?platform=facebook`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:from-blue-500/20 hover:to-indigo-500/20 transition-colors shadow-lg shadow-blue-500/5">
                         <Rocket size={16} />
                         Turbinar Face
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
                      
                      {property.boostedUntil && new Date(property.boostedUntil) > new Date() && (
                        <div className="mt-3 inline-flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                          <Rocket size={14} />
                          Turbinado por mais {Math.ceil((new Date(property.boostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
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
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:bg-white/10"
                    >
                      Gerenciar ofertas
                    </Link>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Link
                          href={`/minha-conta/anuncios/${property.id}/instagram`}
                          className="flex flex-1 justify-center items-center gap-2 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors"
                        >
                          <Camera size={16} />
                          {isPublished ? 'Republicar no Insta' : 'Publicar no Insta'}
                        </Link>
                        {isPublished && permalink && (
                          <a href={permalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-pink-500/10 px-4 py-3 text-sm text-pink-300 hover:bg-pink-500/20">
                             Ver Post
                          </a>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Link
                          href={`/minha-conta/anuncios/${property.id}/facebook`}
                          className="flex flex-1 justify-center items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors"
                        >
                          <Globe size={16} />
                          {facebookPosts.find(p => p.listingId === property.id) ? 'Republicar no Face' : 'Publicar no Face'}
                        </Link>
                        {facebookPosts.find(p => p.listingId === property.id)?.validationReport?.permalink && (
                          <a href={facebookPosts.find(p => p.listingId === property.id)?.validationReport?.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-blue-500/10 px-4 py-3 text-sm text-blue-300 hover:bg-blue-500/20">
                             Ver Post
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {isPublished && (
                          <Link href={`/minha-conta/anuncios/${property.id}/turbinar?platform=instagram`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 px-4 py-3 text-xs font-semibold text-indigo-300 hover:from-purple-500/20 hover:to-indigo-500/20 transition-colors shadow-lg shadow-indigo-500/5">
                             <Rocket size={14} />
                             Turbinar Insta
                          </Link>
                        )}
                        {facebookPosts.find(p => p.listingId === property.id) && (
                          <Link href={`/minha-conta/anuncios/${property.id}/turbinar?platform=facebook`} className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-4 py-3 text-xs font-semibold text-indigo-300 hover:from-blue-500/20 hover:to-indigo-500/20 transition-colors shadow-lg shadow-indigo-500/5">
                             <Rocket size={14} />
                             Turbinar Face
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>
    </main>
  );
}