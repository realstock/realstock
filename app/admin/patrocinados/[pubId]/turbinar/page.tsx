"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Rocket, Target, CalendarDays, Wallet } from "lucide-react";

export default function AdminLoteGooglePage() {
   const { status } = useSession();
  const router = useRouter();
  const { pubId } = useParams();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform") || "google";

  const [loading, setLoading] = useState(true);
  const [publication, setPublication] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(20);

  const DURATION_DAYS = 5;
  const totalInvestment = dailyBudget * DURATION_DAYS;
  const feeAmount = (totalInvestment * 20) / 100; // 20% mock fee visual only for admin
  const siteCharge = totalInvestment + feeAmount;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") loadData();
  }, [status, pubId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch("/api/admin/patrocinados");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const pub = data.publications.find((p: any) => p.id === pubId);
      if (!pub) throw new Error("Publicação (Caixinha) não encontrada.");
      
      setPublication(pub);

    } catch (err: any) {
      setError(err.message || "Erro fatal");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    try {
      setIsPublishing(true);
      setError("");
      
      const res = await fetch(`/api/admin/patrocinados/${pubId}/turbinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, dailyBudget })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) throw new Error(data.error);
      
      setSuccessMsg(`Lote de Patrocinados foi impulsionado com sucesso no ${platform === 'google' ? 'Google' : 'Meta'} Ads!`);
    } catch(err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-400">Carregando admin ads...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/admin/patrocinados" className="text-sm text-slate-400 hover:text-white">← Voltar</Link>
            <h1 className="mt-4 text-3xl font-bold flex items-center gap-2 text-indigo-400">
               <Rocket size={32} />
               Turbinar Anúncio no {platform === 'google' ? 'Google Search/Display' : 'Meta Ads'}
            </h1>
            <p className="mt-2 text-slate-400">
               {platform === 'google' 
                 ? "Ative uma campanha inteligente no Google Ads para buscar compradores ativos pesquisando na sua região."
                 : "Transforme este lote em um anúncio de alta performance no Facebook e Instagram."}
            </p>
          </div>
        </div>

        {error && <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
        {successMsg && (
          <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-emerald-300">
             <h3 className="font-bold text-xl mb-2">Campanha no ar! 🎉</h3>
             <p>{successMsg}</p>
             <div className="mt-6">
              <Link href="/admin/patrocinados" className="px-5 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition font-bold">
                Retornar ao painel
              </Link>
             </div>
          </div>
        )}

        {!error && !successMsg && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Lado Esquerdo: Detalhes e Configuração */}
            <div className="lg:col-span-7 space-y-6">
               <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
                   <h2 className="text-lg font-bold">Objetivo e Segmentação (Automático)</h2>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                           <Target className="text-blue-400" size={24}/>
                           <div>
                              <div className="text-xs text-slate-400 font-semibold uppercase">Público Foco</div>
                              <div className="font-bold">Ceará</div>
                              <div className="text-xs text-slate-500 mt-1">Geolocalização garantida pro Estado</div>
                           </div>
                       </div>
                       <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                           <CalendarDays className="text-purple-400" size={24}/>
                           <div>
                              <div className="text-xs text-slate-400 font-semibold uppercase">Duração</div>
                              <div className="font-bold">{DURATION_DAYS} Dias corridos</div>
                              <div className="text-xs text-slate-500 mt-1">Campanha de tráfego contínuo</div>
                           </div>
                       </div>
                   </div>
               </div>

               <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-6">
                   <h2 className="text-xl font-bold mb-1">Qual o orçamento diário do anúncio?</h2>
                   <p className="text-sm text-slate-400 mb-8">Arraste a barra para definir quanto investir na plataforma {platform === 'google' ? 'Google' : 'Meta'} por dia.</p>
                   
                   <div className="mb-4 flex justify-between items-end">
                       <span className="text-sm font-bold text-slate-500">R$ 10</span>
                       <div className="text-center">
                           <span className="text-3xl font-black text-indigo-400">R$ {dailyBudget}</span>
                           <span className="text-sm text-slate-400">/dia</span>
                       </div>
                       <span className="text-sm font-bold text-slate-500">R$ 150</span>
                   </div>

                   <input 
                      type="range" 
                      min="10" 
                      max="150" 
                      step="5"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(Number(e.target.value))}
                      className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                   />
               </div>
            </div>

            {/* Lado Direito: Resumo e Pagamento */}
            <div className="lg:col-span-5 h-fit sticky top-8">
               <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                   {/* Preview simples do post */}
                   <div className="aspect-[4/3] w-full bg-slate-800 relative">
                       <img src="/placeholder-house.webp" className="w-full h-full object-cover opacity-60 fallback-img" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" }} alt="Preview" />
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                       <div className="absolute bottom-4 left-4 right-4">
                           <div className="text-xs uppercase bg-white/20 px-2 py-1 inline-block rounded text-white font-bold tracking-wider mb-2 backdrop-blur-sm shadow">Preview Patrocinado</div>
                           <h3 className="font-bold text-lg leading-tight line-clamp-2">Portfólio de Imóveis (Todos)</h3>
                       </div>
                   </div>

                   <div className="p-6">
                       <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Wallet size={20}/> Resumo Financeiro</h3>
                       
                       <div className="space-y-3 text-sm border-b border-white/10 pb-4 mb-4">
                           <div className="flex justify-between text-slate-400">
                               <span>Orçamento (R$ {dailyBudget} x {DURATION_DAYS} dias)</span>
                               <span>R$ {totalInvestment.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-slate-400">
                               <span>Taxa de Agenciamento RealStock (20%)</span>
                               <span>R$ {feeAmount.toFixed(2)}</span>
                           </div>
                       </div>

                       <div className="flex justify-between items-center mb-8">
                           <span className="font-semibold text-lg">Total a pagar</span>
                           <span className="text-2xl font-black text-white">R$ {siteCharge.toFixed(2)}</span>
                       </div>

                       {isPublishing && (
                           <div className="text-center py-4 text-indigo-400 font-bold animate-pulse">Integração Google Ads processando...</div>
                       )}

                       {!isPublishing && (
                           <button onClick={handlePublish} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg shadow-indigo-500/20">
                               Publicar
                           </button>
                       )}
                   </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
