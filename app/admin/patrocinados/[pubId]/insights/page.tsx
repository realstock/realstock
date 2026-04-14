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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* INSTAGRAM INSIGHTS */}
            {insights.instagram && (
                <div className="rounded-3xl bg-gradient-to-br from-pink-500/10 to-orange-500/5 border border-pink-500/20 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <img src="/icones/instagram.jpg" className="w-8 h-8 rounded-lg object-cover" alt="Instagram" />
                        <h2 className="text-xl font-bold">Instagram Ads</h2>
                    </div>

                    {metaSessionStatus === "IN_PROCESS" && (
                        <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 p-3 rounded-lg text-sm mb-4 font-semibold shadow-inner">
                            ⚠️ Status: Aguardando aprovação da Meta. O prazo está congelado até aprovação.
                        </div>
                    )}
                    {metaSessionStatus === "ACTIVE" && (
                        <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-3 rounded-lg text-sm mb-4 font-semibold shadow-inner">
                            ✅ Status: Turbinado e Rodando!
                        </div>
                    )}
                    {metaSessionStatus === "REJECTED" && (
                        <div className="bg-red-500/20 text-red-300 border border-red-500/30 p-3 rounded-lg text-sm mb-4 font-semibold shadow-inner">
                            ❌ Anúncio Reprovado.
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                            <Heart className="text-pink-400 mb-2" size={20} />
                            <div className="text-2xl font-black">{insights.instagram.likes}</div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Curtidas</div>
                        </div>
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                            <MessageCircle className="text-orange-400 mb-2" size={20} />
                            <div className="text-2xl font-black">{insights.instagram.comments}</div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Comentários</div>
                        </div>
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5 col-span-2 flex items-center justify-between">
                            <div>
                                <Eye className="text-purple-400 mb-1" size={20} />
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visualizações</div>
                            </div>
                            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                                {insights.instagram.views.toLocaleString('pt-BR')}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FACEBOOK INSIGHTS */}
            {insights.facebook && (
                <div className="rounded-3xl bg-gradient-to-br from-blue-600/10 to-indigo-500/5 border border-blue-500/20 p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <img src="/icones/facebook.jpeg" className="w-8 h-8 rounded-lg object-cover" alt="Facebook" />
                        <h2 className="text-xl font-bold">Facebook Ads</h2>
                    </div>

                    {metaSessionStatus === "IN_PROCESS" && (
                        <div className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 p-3 rounded-lg text-sm mb-4 font-semibold shadow-inner">
                            ⚠️ Status: Aguardando aprovação da Meta. O prazo está congelado até aprovação.
                        </div>
                    )}
                    {metaSessionStatus === "ACTIVE" && (
                        <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-3 rounded-lg text-sm mb-4 font-semibold shadow-inner">
                            ✅ Status: Turbinado e Rodando!
                        </div>
                    )}
                    {metaSessionStatus === "REJECTED" && (
                        <div className="bg-red-500/20 text-red-300 border border-red-500/30 p-3 rounded-lg text-sm mb-4 font-semibold shadow-inner">
                            ❌ Anúncio Reprovado.
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                            <Users className="text-blue-400 mb-2" size={20} />
                            <div className="text-2xl font-black">{insights.facebook.impressions.toLocaleString('pt-BR')}</div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Impressões</div>
                        </div>
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                            <MousePointerClick className="text-indigo-400 mb-2" size={20} />
                            <div className="text-2xl font-black">{insights.facebook.clicks}</div>
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliques no Link</div>
                        </div>
                        <div className="bg-black/30 p-4 rounded-2xl backdrop-blur-sm border border-white/5 col-span-2 flex items-center justify-between">
                            <div>
                                <TrendingUp className="text-blue-300 mb-1" size={20} />
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alcance Social</div>
                            </div>
                            <div className="text-3xl font-black text-blue-400">
                                {insights.facebook.likes + insights.facebook.shares} Interações
                            </div>
                        </div>
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
                                <span className="text-slate-800 text-xs">www.realstock.com.br › patrocinados</span>
                            </div>
                            <h3 className="text-[#1a0dab] font-normal text-[20px] leading-tight hover:underline cursor-pointer">
                                Veja essas oportunidades de imóveis perto de você na www.RealStock.com.br
                            </h3>
                            <p className="text-[#4d5156] text-[14px] leading-snug mt-1">
                                Venha conhecer esta excelente oportunidade exclusiva da RealStock. Faça sua proposta. Opção imperdível para compra ou locação. Fale com nossos experts.
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
