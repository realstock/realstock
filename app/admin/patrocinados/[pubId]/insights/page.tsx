"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Heart, MessageCircle, Eye, MousePointerClick, Activity, DollarSign, Rocket } from "lucide-react";

export default function AdminInsightsPage({ params }: { params: Promise<{ pubId: string }> }) {
  const { pubId } = use(params);
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchInsights();
    }
  }, [status, router]);

  async function fetchInsights() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/patrocinados/${pubId}/insights`);
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error || "Dados não encontrados.");
      }

      setData(payload);
    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white"><div className="mx-auto max-w-5xl text-slate-400">Carregando painel analítico do Lote Admin...</div></main>;
  }

  if (error) {
     return (
       <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
          <div className="mx-auto max-w-5xl">
             <Link href="/admin/patrocinados" className="text-sm text-slate-400 hover:text-white mb-4 block">← Voltar</Link>
             <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
               <h2 className="font-bold text-lg mb-2">Relatório Indisponível</h2>
               <p>{error}</p>
             </div>
          </div>
       </main>
     );
  }

  const { title, isBoosted, metaSessionStatus, insights } = data;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/patrocinados" className="text-sm text-slate-400 hover:text-white">← Voltar à Tabela Admin</Link>
        
        <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 mb-8">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                   <BarChart3 className="text-indigo-400" size={32} />
                   Performance Analítica
                </h1>
                <p className="mt-1 text-slate-400 text-lg">Lote Admin: {title}</p>
            </div>
            {isBoosted && (
                <div className="mt-4 md:mt-0 flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full font-bold border border-indigo-500/30">
                    <Rocket size={18} />
                    Anúncios Pagos Ativos
                </div>
            )}
        </div>

        {/* IMPACT SUMMARY TILES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Impacto Total</div>
                <div className="text-4xl font-black text-white">
                    {( (insights.instagram?.views || 0) + (insights.facebook?.impressions || 0) + (insights.metaAds?.views || 0) ).toLocaleString('pt-BR')}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 uppercase">Alcance Global (Orgânico + Pago)</div>
            </div>
            
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 flex flex-col justify-center">
                <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Poder do Boost</div>
                <div className="text-4xl font-black text-indigo-400">
                    {Math.round(((insights.metaAds?.views || 0) / ( ( (insights.instagram?.views || 0) + (insights.facebook?.impressions || 0) + (insights.metaAds?.views || 0) ) || 1)) * 100)}%
                </div>
                <div className="text-[10px] text-indigo-500 mt-1 uppercase">Eficiência do investimento</div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-center">
                <div className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1">Engajamento Total</div>
                <div className="text-4xl font-black text-emerald-400">
                    {( (insights.instagram?.likes || 0) + (insights.instagram?.comments || 0) + (insights.metaAds?.likes || 0) ).toLocaleString('pt-BR')}
                </div>
                <div className="text-[10px] text-emerald-500 mt-1 uppercase">Interações diretas registradas</div>
            </div>
        </div>

        {/* DETAIL CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* ORGANIC DASHBOARD */}
            {(insights.instagram || insights.facebook) && (
                <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 p-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-white/10 p-2 rounded-xl">
                            <Users size={20} className="text-slate-300" />
                        </div>
                        <h2 className="text-xl font-bold">Alcance Orgânico</h2>
                    </div>
                    <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                        Performance natural dos posts publicados sem investimento direto em anúncios.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5 flex items-center justify-between">
                            <div>
                                <Eye className="text-slate-400 mb-1" size={20} />
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visualizações Gratuitas</div>
                            </div>
                            <div className="text-3xl font-black text-white">
                                {((insights.instagram?.views || 0) + (insights.facebook?.impressions || 0)).toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                <Heart className="text-pink-400 mb-2" size={20} />
                                <div className="text-xl font-black">{(insights.instagram?.likes || 0) + (insights.facebook?.likes || 0)}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Curtidas</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                <MessageCircle className="text-blue-400 mb-2" size={20} />
                                <div className="text-xl font-black">{(insights.instagram?.comments || 0) + (insights.facebook?.comments || 0)}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase">Comentários</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PAID DASHBOARD (META ADS) */}
            {insights.metaAds && (
                <div className="rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-500/10 border border-indigo-500/30 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/20">
                            <Rocket size={20} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold">Impulsionamento</h2>
                    </div>

                    <p className="text-xs text-indigo-300 mb-6 leading-relaxed">
                        Pessoas alcançadas através do investimento pago em tráfego social.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-black/40 p-4 rounded-2xl backdrop-blur-sm border border-indigo-500/20 flex items-center justify-between">
                            <div>
                                <TrendingUp className="text-indigo-400 mb-1" size={24} />
                                <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Visualizações Pagas</div>
                            </div>
                            <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                {insights.metaAds.views.toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                <MousePointerClick className="text-indigo-400 mb-2" size={20} />
                                <div className="text-xl font-black">{insights.metaAds.clicks}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Cliques</div>
                            </div>
                            <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                <Activity className="text-purple-400 mb-2" size={20} />
                                <div className="text-xl font-black">{Math.round((insights.metaAds.clicks / (insights.metaAds.views || 1)) * 1000) / 10}%</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Interesse</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GOOGLE ADS PANEL */}
            {insights.google && (
                <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-xl text-blue-500">G</div>
                        <h2 className="text-xl font-bold">Google Search</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                            <Activity className="text-emerald-400 mb-2" size={20} />
                            <div className="text-xl font-black">{insights.google.ctr}%</div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CTR Fluxo</div>
                        </div>
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                            <MousePointerClick className="text-teal-400 mb-2" size={20} />
                            <div className="text-xl font-black">{insights.google.clicks}</div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visitas Site</div>
                        </div>
                        
                        <div className="bg-white p-4 rounded-2xl col-span-2 mt-2 shadow-inner">
                            <div className="text-[10px] text-slate-500 font-bold mb-2 uppercase opacity-60">Prévia de Busca:</div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-black border border-black rounded px-1 text-[8px]">Patrocinado</span>
                                <span className="text-slate-800 text-[10px]">RealStock Brasil</span>
                            </div>
                            <h3 className="text-[#1a0dab] text-sm leading-tight">Melhores Oportunidades Imobiliárias</h3>
                            <p className="text-[#4d5156] text-[11px] leading-snug mt-1 line-clamp-2">
                                Confira os lotes e imóveis selecionados nesta publicação exclusiva. Realize seu sonho hoje.
                            </p>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </main>
  );
}
