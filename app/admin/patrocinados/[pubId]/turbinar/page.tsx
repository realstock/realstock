"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Rocket } from "lucide-react";

export default function AdminLoteTurbinacaoPage() {
  const { status } = useSession();
  const router = useRouter();
  const { pubId } = useParams();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform"); // "google" or "facebook"

  const [loading, setLoading] = useState(true);
  const [publication, setPublication] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [budget, setBudget] = useState(10);
  const [days, setDays] = useState(10);
  const [targetUrl, setTargetUrl] = useState("https://realstock.com.br");

  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") loadData();
  }, [status, pubId, platform]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch("/api/admin/patrocinados");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (pubId === "-1") {
          setPublication({ id: "-1", name: "Portfólio Global da Base" });
      } else {
          const pub = data.publications.find((p: any) => p.id === pubId);
          if (!pub) throw new Error("Publicação (Caixinha) não encontrada.");
          setPublication(pub);
      }
    } catch (err: any) {
      setError(err.message || "Erro fatal");
    } finally {
      setLoading(false);
    }
  }

  async function handleTurbinar() {
    try {
      setIsPublishing(true);
      setError("");
      
      const res = await fetch(`/api/admin/patrocinados/${pubId}/turbinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
           platform,
           budget,
           days,
           targetUrl
        })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) throw new Error(data.error);
      
      setSuccessMsg(`Lote Patrocinado turbinado com sucesso no ${platform === 'google' ? 'Google Ads' : 'Meta Ads'}!`);
    } catch(err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-400">Carregando lote...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/patrocinados" className="text-slate-400 hover:text-white mb-6 inline-block">← Voltar</Link>
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2" style={{ color: platform === 'google' ? '#10b981' : '#6366f1'}}>
           <Rocket size={28} />
           Turbinar Lote no {platform === 'google' ? 'Google Ads' : 'Meta Ads'}
        </h1>
        <p className="text-slate-400">
           Configuração administrativa VIP (Sem integração com PayPal) para turbinar o Lote "{publication?.name}".
        </p>

        {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
        {successMsg && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
             {successMsg}
             <div className="mt-4"><Link href="/admin/patrocinados" className="underline">Voltar à Central</Link></div>
          </div>
        )}

        {!error && !successMsg && (
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-200">Parâmetros de Impulsionamento</h3>
                
                <div className="space-y-4">
                   <div>
                     <label className="block text-sm text-slate-400 mb-1">Qual o Link de Destino do Lote?</label>
                     <input type="text" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} className="w-full bg-slate-800 border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" />
                     <p className="text-xs text-slate-500 mt-1">Como são múltiplos anúncios no pacote, o Google/Meta exigem um site de destino genérico ou de resultados de busca global.</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-sm text-slate-400 mb-1">Dias Mantidos (Orçamento)</label>
                       <input type="number" min={1} value={days} onChange={e => setDays(Number(e.target.value))} className="w-full bg-slate-800 border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" />
                     </div>
                     <div>
                       <label className="block text-sm text-slate-400 mb-1">Custo Diário (R$)</label>
                       <input type="number" min={5} value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-full bg-slate-800 border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500" />
                     </div>
                   </div>
                </div>
            </div>

            <div className="rounded-2xl border bg-gradient-to-br from-indigo-500/5 to-slate-900 overflow-hidden" style={{ borderColor: platform === 'google' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.4)' }}>
                 <div className="p-6 flex flex-col justify-center text-center h-full">
                     <h2 className="text-xl font-bold text-white mb-2">Disparo Direto nas APIs</h2>
                     <p className="text-sm text-slate-400 mb-8">Esta página salta o PayPal. Os custos caem diretamente no cartão cadastrado nativamente dentro do {platform === 'google' ? 'Manager do Google' : 'Manager do Facebook/Meta'}.</p>
                     
                     <button 
                       onClick={handleTurbinar}
                       disabled={isPublishing} 
                       className="w-full px-6 py-4 rounded-xl font-bold text-white transition disabled:opacity-50"
                       style={{ background: platform === 'google' ? '#10b981' : '#6366f1' }}
                     >
                         {isPublishing ? "Conectando ao Manager e Injetando Campanha..." : "Lançar Orçamento Imediatamente"}
                     </button>
                 </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
