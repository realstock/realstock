"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BarChart3, TrendingUp, Users, Heart, MessageCircle, Eye, MousePointerClick, Activity, DollarSign, Rocket, X } from "lucide-react";

export default function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { status } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (status === "authenticated") {
            fetchInsights();
        }
    }, [status]);

    useEffect(() => {
        if (!loading) return;
        
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 92) {
                    clearInterval(interval);
                    return prev;
                }
                // Progresso orgânico: mais rápido no começo, lento no final
                const increment = prev < 60 ? 3 : 0.5;
                return Math.min(prev + increment, 92);
            });
        }, 80);

        return () => clearInterval(interval);
    }, [loading]);

    async function fetchInsights() {
        try {
            setLoading(true);
            setProgress(0);
            const res = await fetch(`/api/minha-conta/anuncios/${id}/insights`);
            const payload = await res.json();

            if (!res.ok || !payload.success) {
                throw new Error(payload.error || "Dados não encontrados.");
            }

            setProgress(100);
            // Pequeno delay para o usuário ver o 100% antes de carregar
            setTimeout(() => {
                setData(payload);
                setLoading(false);
            }, 400);
            
        } catch (err: any) {
            setError(err.message || "Erro de conexão.");
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
                <div className="w-full max-w-md text-center">
                    <div className="mb-8 flex justify-center">
                        <div className="bg-indigo-500/20 p-4 rounded-3xl animate-pulse">
                            <Activity className="text-indigo-400" size={48} />
                        </div>
                    </div>
                    
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Processamento Graph API</h2>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mb-8">Sincronizando métricas em tempo real...</p>
                    
                    <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 transition-all duration-300 ease-out shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="animate-pulse">{progress < 100 ? 'Analisando dados...' : 'Finalizado!'}</span>
                        <span className="text-indigo-400">{Math.round(progress)}%</span>
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-6">
                        <Link 
                            href="/minha-conta/anuncios" 
                            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg group"
                        >
                            <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
                            Voltar para Anúncios
                        </Link>
                    </div>
                    <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
                        <h2 className="font-bold text-lg mb-2">Relatório Indisponível</h2>
                        <p>{error}</p>
                    </div>
                </div>
            </main>
        );
    }

    const { title, city, state, isBoosted, metaSessionStatus, insights } = data;

    const igTotalViews = insights.instagram?.posts?.reduce((sum: number, p: any) => sum + (p.views || 0), 0) || 0;
    const fbTotalViews = insights.facebook?.posts?.reduce((sum: number, p: any) => sum + (p.views || 0), 0) || 0;
    const igTotalLikes = insights.instagram?.posts?.reduce((sum: number, p: any) => sum + (p.likes || 0), 0) || 0;
    const fbTotalLikes = insights.facebook?.posts?.reduce((sum: number, p: any) => sum + (p.likes || 0), 0) || 0;
    const igTotalComments = insights.instagram?.posts?.reduce((sum: number, p: any) => sum + (p.comments || 0), 0) || 0;
    const fbTotalComments = insights.facebook?.posts?.reduce((sum: number, p: any) => sum + (p.comments || 0), 0) || 0;

    return (
        <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
            <div className="mx-auto max-w-5xl">
                <div className="mb-6">
                    <Link 
                        href="/minha-conta/anuncios" 
                        className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg group"
                    >
                        <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
                        Voltar para Anúncios
                    </Link>
                </div>

                <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <BarChart3 className="text-indigo-400" size={32} />
                            Performance do Anúncio
                        </h1>
                        <p className="mt-1 text-slate-400 text-lg">{title}</p>
                    </div>
                    {isBoosted && (
                        <div className="mt-4 md:mt-0 flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full font-bold border border-indigo-500/30">
                            <Rocket size={18} />
                            Modo Premium Ativo
                        </div>
                    )}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Impacto Total</div>
                        <div className="text-4xl font-black text-white">
                            {(data.totalImpact || 0).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 uppercase leading-none">
                            Incl. {(insights.google?.impressions || 0).toLocaleString('pt-BR')} impressões Google
                        </div>
                    </div>

                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex flex-col justify-center">
                        <div className="text-emerald-300 text-xs font-bold uppercase tracking-widest mb-1 font-black">Visualizações Orgânicas</div>
                        <div className="text-4xl font-black text-emerald-400">
                            {(igTotalViews + fbTotalViews).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-emerald-500 mt-1 uppercase leading-none">Vindo do Instagram/Facebook</div>
                    </div>
                    
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-3xl p-6 flex flex-col justify-center border-dashed">
                        <div className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Poder do Boost</div>
                        <div className="text-4xl font-black text-indigo-400">
                            {((((insights.metaAds?.views || 0) + (insights.google?.impressions || 0)) / (data.totalImpact || 1)) * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-indigo-500 mt-1 uppercase leading-none">Vindo de Anúncios Pagos</div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-center">
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Engajamento</div>
                        <div className="text-4xl font-black text-white">
                            {( igTotalLikes + igTotalComments + fbTotalLikes + fbTotalComments + (insights.metaAds?.likes || 0) + (insights.google?.clicks || 0) ).toLocaleString('pt-BR')}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 uppercase leading-none">Interações totais</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* INSTAGRAM ORGANIC */}
                    <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900 border border-fuchsia-500/20 p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-fuchsia-500/20 p-2 rounded-xl">
                                <Heart size={20} className="text-fuchsia-400" />
                            </div>
                            <h2 className="text-xl font-bold">Instagram</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                            Interações orgânicas vindas diretamente da página do Instagram da RealStock.
                        </p>

                        <div className="flex flex-col gap-4">
                            {insights.instagram?.posts?.length > 0 ? insights.instagram.posts.map((post: any, i: number) => (
                                <div key={i} className="bg-fuchsia-500/10 p-4 rounded-2xl backdrop-blur-sm border border-fuchsia-500/10 flex flex-col gap-3">
                                    <div className="text-xs font-bold text-fuchsia-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <Eye size={14} className="text-fuchsia-400" />
                                        {post.type === 'reels' || post.type === 'VIDEO' ? 'Reels' : 'Carrossel'}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <div className="text-2xl font-black text-white">{(post.views || 0).toLocaleString('pt-BR')}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Views</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-white">{(post.likes || 0).toLocaleString('pt-BR')}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Likes</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-white">{(post.comments || 0).toLocaleString('pt-BR')}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Comments</div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-sm text-slate-500 italic">Nenhum post encontrado.</div>
                            )}
                        </div>
                    </div>

                    {/* FACEBOOK ORGANIC */}
                    <div className="rounded-3xl bg-gradient-to-br from-slate-800/50 to-slate-900 border border-blue-500/20 p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-500/20 p-2 rounded-xl">
                                <Users size={20} className="text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold">Facebook</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                            Interações orgânicas vindas diretamente da página do Facebook da RealStock.
                        </p>

                        <div className="flex flex-col gap-4">
                            {insights.facebook?.posts?.length > 0 ? insights.facebook.posts.map((post: any, i: number) => (
                                <div key={i} className="bg-blue-500/10 p-4 rounded-2xl backdrop-blur-sm border border-blue-500/10 flex flex-col gap-3">
                                    <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <Eye size={14} className="text-blue-400" />
                                        {post.type === 'reels' || post.type === 'VIDEO' ? 'Reels' : 'Carrossel'}
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <div className="text-2xl font-black text-white">{(post.views || 0).toLocaleString('pt-BR')}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Views</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-white">{(post.likes || 0).toLocaleString('pt-BR')}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Likes</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-black text-white">{(post.comments || 0).toLocaleString('pt-BR')}</div>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase">Comments</div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-sm text-slate-500 italic">Nenhum post encontrado.</div>
                            )}
                        </div>
                    </div>

                    {/* PAID INSIGHTS (META ADS) */}
                    {insights.metaAds && (
                        <div className="rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-500/10 border border-indigo-500/30 p-6 shadow-xl relative overflow-hidden col-span-1 md:col-span-1">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-600/30">
                                        <Rocket size={20} className="text-white" />
                                    </div>
                                    <h2 className="text-xl font-bold">Impulsionamento (Meta Ads)</h2>
                                </div>
                            </div>

                            <p className="text-xs text-indigo-300 mb-6 leading-relaxed">
                                Pessoas alcançadas através do seu investimento em tráfego pago nas redes sociais.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/40 p-4 rounded-2xl backdrop-blur-sm border border-indigo-500/20 col-span-2 flex items-center justify-between animate-pulse-subtle">
                                    <div>
                                        <TrendingUp className="text-indigo-400 mb-1" size={24} />
                                        <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Visualizações Pagas</div>
                                    </div>
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                                        {insights.metaAds.views.toLocaleString('pt-BR')}
                                    </div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                    <MousePointerClick className="text-indigo-400 mb-2" size={20} />
                                    <div className="text-xl font-black">{insights.metaAds.clicks}</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Cliques no Anúncio</div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                    <Activity className="text-purple-400 mb-2" size={20} />
                                    <div className="text-xl font-black">{Math.round((insights.metaAds.clicks / (insights.metaAds.views || 1)) * 1000) / 10}%</div>
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Taxa de Interesse</div>
                                </div>

                                {metaSessionStatus === "ACTIVE" && (
                                    <div className="col-span-2 mt-2 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold py-2 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                                        CAMPANHA ATIVA E GERANDO RESULTADOS
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* GOOGLE INSIGHTS */}
                    {insights.google && (
                        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 p-6 shadow-xl relative overflow-hidden md:col-span-2 lg:col-span-1">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-xl text-blue-500">G</div>
                                <h2 className="text-xl font-bold">Google Ads</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-emerald-500/20 col-span-2 flex items-center justify-between">
                                    <div>
                                        <Eye className="text-emerald-400 mb-1" size={24} />
                                        <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Impressões</div>
                                        <div className="text-[10px] text-slate-500">Vezes que seu anúncio apareceu</div>
                                    </div>
                                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                                        {(insights.google.impressions || 0).toLocaleString('pt-BR')}
                                    </div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                    <Activity className="text-emerald-400 mb-2" size={20} />
                                    <div className="text-xl font-black">{insights.google.ctr}%</div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CTR (Cliques)</div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                                    <MousePointerClick className="text-teal-400 mb-2" size={20} />
                                    <div className="text-xl font-black">{insights.google.clicks}</div>
                                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pessoas no Site</div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5 col-span-2 flex items-center justify-between">
                                    <div>
                                        <DollarSign className="text-emerald-400 mb-1" size={20} />
                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo por Clique Médio</div>
                                    </div>
                                    <div className="text-xl font-black text-emerald-400">
                                        {insights.google.cpc}
                                    </div>
                                </div>

                                {/* Prévia do Google Search */}
                                <div className="bg-white p-5 rounded-2xl col-span-2 mt-2 shadow-inner">
                                    <div className="text-xs text-slate-500 font-semibold mb-3 border-b pb-2">PRÉVIA DE COMO SEU CLIENTE VÊ NA BUSCA DO GOOGLE:</div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-black border border-black rounded px-1 text-[10px]">Patrocinado</span>
                                        <span className="text-slate-800 text-xs">www.realstock.com.br › imovel › {id}</span>
                                    </div>

                                    <h3 className="text-[#1a0dab] font-normal text-[20px] leading-tight hover:underline cursor-pointer">
                                        {id === '0'
                                            ? "Veja essas oportunidades de imóveis perto de você na www.RealStock.com.br"
                                            : `${title} - ${city || ""}, ${state || ""}`
                                        }
                                    </h3>
                                    <p className="text-[#4d5156] text-[14px] leading-snug mt-1">
                                        Venha conhecer estas excelentes oportunidades exclusivas na RealStock.
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
