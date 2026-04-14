"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, RefreshCw, BarChart, ExternalLink, CheckCircle2, CircleDashed } from "lucide-react";

export default function GoogleAdsCostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated" || (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/google-ads-costs");
      const json = await res.json();
      if (json.success) {
        setItems(json.items);
      } else {
        alert("Erro: " + json.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <main className="min-h-screen bg-slate-950 px-6 pt-28 pb-12 text-white">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white mb-2 block">
              ← Voltar ao Painel
            </Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Search className="text-emerald-500" size={32} />
              Auditoria Financeira - Google Ads
            </h1>
            <p className="text-slate-400 mt-1">
              Rastreie em tempo real o saldo gasto pela API da Google de Rede de Pesquisa e as taxas de Custo por Clique (CPC).
            </p>
          </div>
          <div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              {loading ? "Sincronizando..." : "Sincronizar Agora"}
            </button>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-16 bg-slate-900 rounded-2xl w-full"></div>
            <div className="h-16 bg-slate-900 rounded-2xl w-full"></div>
            <div className="h-16 bg-slate-900 rounded-2xl w-full"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center bg-slate-900 rounded-3xl p-12 border border-white/5">
            <BarChart className="mx-auto text-slate-600 mb-4" size={48} />
            <h2 className="text-xl font-bold text-slate-300">Nenhum impulsionamento detectado</h2>
            <p className="text-slate-500 mt-2">As campanhas criadas na Rede de Pesquisa do Google aparecerão aqui automaticamente.</p>
          </div>
        ) : (
          <div className="bg-slate-900 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="p-4 font-semibold">Anúncio Turbinado</th>
                    <th className="p-4 font-semibold">Campanha Google ID</th>
                    <th className="p-4 font-semibold text-right">Investido App</th>
                    <th className="p-4 font-semibold text-right text-emerald-400">Gasto Google (R$)</th>
                    <th className="p-4 font-semibold text-center">Impressões</th>
                    <th className="p-4 font-semibold text-center">Cliques</th>
                    <th className="p-4 font-semibold text-center">CTR %</th>
                    <th className="p-4 font-semibold text-center">CPC (R$)</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((it: any) => (
                    <tr key={it.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 max-w-[200px] truncate font-medium text-slate-200">
                        {it.title}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">
                        {it.campaignId}
                        {it.campaignId && !it.campaignId.startsWith("MOCK") && (
                          <a href={`https://ads.google.com/`} target="_blank" rel="noreferrer" className="inline-block ml-2 text-emerald-400 hover:text-emerald-300">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </td>
                      <td className="p-4 text-right font-medium text-emerald-400 flex flex-col items-end">
                        <span>{formatBRL(it.bRLInvestido)}</span>
                        <span className="text-[10px] text-slate-500">
                          em {new Date(it.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td className="p-4 text-right font-black text-rose-400">
                        {formatBRL(it.googleSpend)}
                      </td>
                      <td className="p-4 text-center text-slate-300">
                        {it.impressions.toLocaleString("pt-BR")}
                      </td>
                      <td className="p-4 text-center font-bold text-blue-400">
                        {it.clicks.toLocaleString("pt-BR")}
                      </td>
                      <td className="p-4 text-center text-amber-400 font-medium">
                        {it.ctr}%
                      </td>
                      <td className="p-4 text-center text-slate-300 font-medium whitespace-nowrap">
                        {formatBRL(it.cpc)}
                      </td>
                      <td className="p-4 text-center">
                        <StatusBadge status={it.apiStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ENABLED" || status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
        <CheckCircle2 size={12} /> Ativo
      </span>
    );
  }
  if (status === "PAUSED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
        <CircleDashed size={12} /> Pausado
      </span>
    );
  }
  if (status.includes("MOCK") || status === "IN_PROCESS") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20 whitespace-nowrap">
        <CircleDashed size={12} /> {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 whitespace-nowrap">
      <Search size={12} /> {status}
    </span>
  );
}
