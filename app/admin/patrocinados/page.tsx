"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Gem, CalendarClock, ExternalLink, MapPin, Rocket, Camera, CheckCircle2, BarChart3 } from "lucide-react";

export default function AdminPatrocinadosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  
  const [instagramPosts, setInstagramPosts] = useState<any[]>([]);
  const [facebookPosts, setFacebookPosts] = useState<any[]>([]);
  const [portfolioBoostedUntil, setPortfolioBoostedUntil] = useState<Date | null>(null);
  const [googlePortfolioBoostedUntil, setGooglePortfolioBoostedUntil] = useState<Date | null>(null);
  const [metaPortfolioBoostedUntil, setMetaPortfolioBoostedUntil] = useState<Date | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      if ((session?.user as any)?.role !== "ADMIN") {
        router.push("/");
        return;
      }
      loadProperties();
    }
  }, [status, router, session]);

  async function loadProperties() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/patrocinados");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar anúncios patrocinados");
      }

      setProperties(data.properties || []);
      setInstagramPosts(data.instagramPosts || []);
      setFacebookPosts(data.facebookPosts || []);
      setPortfolioBoostedUntil(data.portfolioBoostedUntil ? new Date(data.portfolioBoostedUntil) : null);
      setGooglePortfolioBoostedUntil(data.googlePortfolioBoostedUntil ? new Date(data.googlePortfolioBoostedUntil) : null);
      setMetaPortfolioBoostedUntil(data.metaPortfolioBoostedUntil ? new Date(data.metaPortfolioBoostedUntil) : null);
    } catch (err: any) {
      setError(err.message || "Erro de conexão com servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
        <div className="mx-auto max-w-6xl text-slate-400">Carregando painel VIP...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 font-semibold text-red-400">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-yellow-500">
              <Gem size={32} className="text-yellow-400" />
              Anúncios Patrocinados (Ativos)
            </h1>
            <p className="mt-2 text-slate-400">
              Gestão de imóveis premium atualmente com patrocínio global pago e ativo na plataforma.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Voltar ao Dashboard Geral
          </Link>
        </div>

        {(() => {
           if (properties.length === 0) return null;
           
           const portfolioSession = instagramPosts.find(p => p.listingId === -1);
           const facebookPortfolioSession = facebookPosts.find(p => p.listingId === -1);
           const isPublishedAny = !!portfolioSession || !!facebookPortfolioSession;
           const igPermalink = portfolioSession?.validationReport?.permalink;
           const fbPermalink = facebookPortfolioSession?.validationReport?.permalink;

           return (
             <div className="mb-8 rounded-2xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-slate-900/50 p-6 shadow-lg shadow-yellow-500/5">
                <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                 <div className="flex-1">
                   <h2 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
                     Portfólio Global (Carrossel Patrocinados)
                   </h2>
                   
                   <div className="mt-4">
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${isPublishedAny ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'}`}>
                        {isPublishedAny ? <CheckCircle2 size={20} /> : <Camera size={20} />}
                        {isPublishedAny ? 'Portfólio Global ativo nas Redes!' : 'Promova esses patrocínios'}
                      </div>
                      <div className="mt-2 text-sm text-slate-400 max-w-lg">
                        {isPublishedAny 
                          ? 'O carrossel com anúncios selecionados do sistema foi publicado nas redes sociais da Imobiliária. Utilize os botões abaixo para turbinar essas postagens.'
                          : 'Crie uma postagem em lote para o Instagram e Facebook da plataforma usando os anúncios patrocinados para dar visibilidade massiva.'}
                      </div>

                      {metaPortfolioBoostedUntil && new Date(metaPortfolioBoostedUntil) > new Date() && (
                        <div className="mt-3 inline-flex items-center gap-1 w-fit rounded bg-indigo-500/20 px-2 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                          <Rocket size={14} />
                          Meta Ads: {Math.ceil((new Date(metaPortfolioBoostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias rest.
                        </div>
                      )}
                      
                      {googlePortfolioBoostedUntil && new Date(googlePortfolioBoostedUntil) > new Date() && (
                        <div className="mt-2 inline-flex items-center gap-1 w-fit rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          <Rocket size={14} />
                          Google Ads: {Math.ceil((new Date(googlePortfolioBoostedUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias rest.
                        </div>
                      )}
                   </div>
                 </div>

                 <div className="flex flex-col gap-2 min-w-[300px]">
                   {(isPublishedAny || googlePortfolioBoostedUntil || metaPortfolioBoostedUntil) && (
                     <Link href="/admin/patrocinados/-1/insights" className="flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/20 transition-colors">
                       <BarChart3 size={16} />
                       Estatísticas do Portfólio Global
                     </Link>
                   )}
                   {igPermalink && (
                     <a href={igPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors">
                       <img src="/icones/instagram.jpg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Instagram" />
                       Acessar no Instagam
                     </a>
                   )}
                   {fbPermalink && (
                     <a href={fbPermalink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors">
                       <img src="/icones/facebook.jpeg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Facebook" />
                       Acessar no Facebook
                     </a>
                   )}

                   <div className="flex gap-2 w-full justify-end">
                     <Link href="/admin/patrocinados/portfolio-instagram" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-pink-400/20 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors">
                       <img src="/icones/instagram.jpg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Instagram" />
                       {portfolioSession ? 'Reprogramar no Insta' : 'Publicar no Insta'}
                     </Link>
                     <Link href="/admin/patrocinados/portfolio-facebook" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors">
                       <img src="/icones/facebook.jpeg" className="w-5 h-5 rounded hover:scale-110 transition-transform object-cover flex-shrink-0" alt="Facebook" />
                       {facebookPortfolioSession ? 'Reprogramar no Face' : 'Publicar no Face'}
                     </Link>
                   </div>
                   
                   <div className="flex w-full gap-2 mt-2 flex-wrap sm:flex-nowrap">
                     {portfolioSession && (
                       <Link href="/admin/patrocinados/-1/turbinar?platform=instagram" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-indigo-300 hover:from-purple-500/20 hover:to-indigo-500/20 transition-colors shadow-lg shadow-indigo-500/5">
                         <Rocket size={16} />
                         Turbinar Insta
                       </Link>
                     )}
                     {facebookPortfolioSession && (
                       <Link href="/admin/patrocinados/-1/turbinar?platform=facebook" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-blue-300 hover:from-blue-500/20 hover:to-indigo-500/20 transition-colors shadow-lg shadow-blue-500/5">
                         <Rocket size={16} />
                         Turbinar Face
                       </Link>
                     )}
                     <Link href="/admin/patrocinados/-1/turbinar?platform=google" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-300 hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors shadow-lg shadow-emerald-500/5">
                       <Rocket size={16} />
                       Google Ads
                     </Link>
                   </div>
                 </div>
                </div>
             </div>
           );
        })()}

        {properties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-12 text-center text-slate-400">
            Nenhum anúncio patrocinado ativo no momento.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const expireDate = new Date(property.sponsoredUntil);
              const daysLeft = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              return (
                <div
                  key={property.id}
                  className="rounded-2xl border border-yellow-500/30 bg-gradient-to-b from-yellow-500/10 to-slate-900 p-6 relative overflow-hidden group shadow-lg shadow-yellow-500/5"
                >
                  <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-xs font-black px-3 py-1 rounded-bl-xl shadow flex items-center gap-1">
                    💎 Ativo
                  </div>
                  <div className="mb-4">
                    <h3 className="line-clamp-2 text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                      {property.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                      <MapPin size={14} />
                      {property.city}, {property.state}
                    </div>
                  </div>

                  <div className="mb-6 space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                       <span className="text-slate-500">Proprietário</span>
                       <span className="font-semibold text-slate-300">{property.owner?.name?.split(" ")[0]} (ID: {property.owner?.id})</span>
                    </div>
                    <div className="flex justify-between pt-1">
                       <span className="text-slate-500 flex items-center gap-1"><CalendarClock size={16} className="text-yellow-500/80"/> Restante</span>
                       <span className="font-bold text-emerald-400">{daysLeft} dias</span>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                       Vence em: {expireDate.toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 flex gap-2">
                    <Link
                      href={`/imovel/${property.id}`}
                      target="_blank"
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <ExternalLink size={16} /> Abrir Página
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
