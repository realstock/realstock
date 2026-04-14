"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LineChart, DollarSign, ArrowUpRight, ArrowDownRight, Activity, Plus } from "lucide-react";

const CATEGORIES: Record<string, string> = {
  SPONSOR: "Patrocínios (Planos)",
  OFFER: "Aprovação de Ofertas",
  POSTS: "Postagens (Portfolio/Mídias)",
  ADS_BOOST: "Impulsionamentos Ads",
  PAYPAL_FEE: "Tarifas do PayPal",
  META_ADS: "Custos com Meta Ads",
  GOOGLE_ADS: "Custos com Google Ads",
  VERCEL: "Hospedagem (Vercel)",
  SUPABASE: "Banco de Dados (Supabase)",
  OTHER: "Outros",
};

export default function ContabilidadePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState<"REVENUE" | "EXPENSE" | null>(null);
  const [form, setForm] = useState({
    type: "EXPENSE",
    category: "VERCEL",
    amount: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" || (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, month, year]);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/contabilidade?month=${month}&year=${year}`);
      const json = await res.json();
      if (json.success) setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount))) return alert("Valor inválido");
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/contabilidade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setShowModal(false);
        setForm({ ...form, amount: "", description: "" });
        fetchData();
      } else {
        alert("Erro: " + json.error);
      }
    } catch (error) {
      alert("Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || (loading && !data)) {
    return <main className="min-h-screen bg-slate-950 p-6 pt-24 text-white text-center">Processando Livro Caixa...</main>;
  }

  const formatBRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <main className="min-h-screen bg-slate-950 px-6 pt-28 pb-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-sm text-slate-400 hover:text-white mb-2 block">← Voltar ao Painel</Link>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <LineChart className="text-emerald-400" size={32} />
              Contabilidade Oficial
            </h1>
            <p className="text-slate-400">Controle financeiro da plataforma RealStock</p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-900 border border-white/10 p-3 rounded-2xl">
            <select className="bg-slate-800 border border-white/10 rounded-lg p-2 outline-none" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}</option>)}
            </select>
            <select className="bg-slate-800 border border-white/10 rounded-lg p-2 outline-none" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <button 
                 onClick={() => setShowTransactionsModal("REVENUE")} 
                 className="text-left bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/20 p-6 rounded-3xl shadow-xl flex items-center gap-4 hover:border-emerald-500/50 transition-colors cursor-pointer group"
              >
                 <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <ArrowUpRight size={28} />
                 </div>
                 <div>
                    <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Receitas (Ver Detalhes)</div>
                    <div className="text-2xl font-black text-emerald-400">{formatBRL(data.summary.totalRevenue)}</div>
                 </div>
              </button>
              
              <button 
                 onClick={() => setShowTransactionsModal("EXPENSE")} 
                 className="text-left bg-gradient-to-br from-rose-500/20 to-pink-500/5 border border-rose-500/20 p-6 rounded-3xl shadow-xl flex items-center gap-4 hover:border-rose-500/50 transition-colors cursor-pointer group"
              >
                 <div className="w-14 h-14 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                    <ArrowDownRight size={28} />
                 </div>
                 <div>
                    <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Despesas (Ver Detalhes)</div>
                    <div className="text-2xl font-black text-rose-400">{formatBRL(data.summary.totalExpense)}</div>
                 </div>
              </button>

              <div className={`bg-gradient-to-br p-6 border rounded-3xl shadow-xl flex items-center gap-4 ${data.summary.netProfit >= 0 ? "from-indigo-500/20 to-blue-500/5 border-indigo-500/30" : "from-red-600/20 border-red-500/30"}`}>
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${data.summary.netProfit >= 0 ? "bg-indigo-500/20 text-indigo-400" : "bg-red-500/20 text-red-400"}`}>
                    <Activity size={28} />
                 </div>
                 <div>
                    <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Lucro Líquido</div>
                    <div className={`text-2xl font-black ${data.summary.netProfit >= 0 ? "text-indigo-400" : "text-red-400"}`}>{formatBRL(data.summary.netProfit)}</div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Receitas Detalhadas */}
               <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><DollarSign className="text-emerald-400"/> Entradas Automáticas do Site</h2>
                  <div className="space-y-3">
                     {Object.entries(data.breakdowns.revenues).map(([key, val]) => (
                        Number(val) > 0 && (
                          <div key={key} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                            <span className="text-slate-300 font-medium">{CATEGORIES[key] || key}</span>
                            <span className="font-bold text-emerald-400">{formatBRL(Number(val))}</span>
                          </div>
                        )
                     ))}
                     {Object.values(data.breakdowns.revenues).reduce((a:any,b:any) => a+b, 0) === 0 && <div className="text-slate-500 text-sm italic">Nenhuma receita computada neste mês.</div>}
                  </div>
               </div>

               {/* Despesas Detalhadas */}
               <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="text-rose-400"/> Custos da Plataforma</h2>
                    <button onClick={() => setShowModal(true)} className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1"><Plus size={14} /> Registrar Despesa Manual</button>
                  </div>
                  <div className="space-y-3">
                     {Object.entries(data.breakdowns.expenses).map(([key, val]) => (
                        Number(val) > 0 && (
                          <div key={key} className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                            <span className="text-slate-300 font-medium">{CATEGORIES[key] || key}</span>
                            <span className="font-bold text-rose-400">{formatBRL(Number(val))}</span>
                          </div>
                        )
                     ))}
                     {Object.values(data.breakdowns.expenses).reduce((a:any,b:any) => a+b, 0) === 0 && <div className="text-slate-500 text-sm italic">Nenhuma despesa computada neste mês.</div>}
                  </div>
               </div>
            </div>

            {/* Modal de inserção manual */}
            {showModal && (
               <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
                     <h2 className="text-xl font-bold mb-4">Lançamento de Despesa Manual</h2>
                     <p className="text-sm text-slate-400 mb-6">Insira gastos como faturas do Vercel, Supabase ou cobranças esporádicas no mês atual.</p>
                     
                     <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                           <label className="text-xs font-semibold text-slate-400">CATEGORIA DA DESPESA</label>
                           <select className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 outline-none mt-1" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                              <option value="VERCEL">Hospedagem Vercel</option>
                              <option value="SUPABASE">Banco de Dados Supabase</option>
                              <option value="GOOGLE_ADS">Fatura Adicional Google Ads</option>
                              <option value="META_ADS">Fatura Adicional Meta Ads</option>
                              <option value="OTHER">Outros Custos / Gerais</option>
                           </select>
                        </div>
                        <div>
                           <label className="text-xs font-semibold text-slate-400">VALOR (R$)</label>
                           <input type="number" step="0.01" required className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 outline-none mt-1" placeholder="Ex: 110.50" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                        </div>
                        <div>
                           <label className="text-xs font-semibold text-slate-400">DESCRIÇÃO (Opcional)</label>
                           <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 outline-none mt-1" placeholder="Ex: Fatura Vercel Pro Outubro" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                        </div>
                        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/10">
                           <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 px-4 rounded-xl font-semibold border border-white/10 hover:bg-white/5 transition-all text-sm">Cancelar</button>
                           <button type="submit" disabled={submitting} className="flex-1 py-3 px-4 rounded-xl font-semibold bg-indigo-500 hover:bg-indigo-400 text-white transition-all text-sm">Salvar Despesa</button>
                        </div>
                     </form>
                  </div>
               </div>
            )}

            {/* Modal de Detalhamento das Transações (Caixa) */}
            {showTransactionsModal && (
               <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                  <div className="w-full max-w-3xl bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                           {showTransactionsModal === "REVENUE" ? <ArrowUpRight className="text-emerald-400"/> : <ArrowDownRight className="text-rose-400"/>}
                           {showTransactionsModal === "REVENUE" ? "Extrato de Receitas" : "Extrato de Despesas"}
                        </h2>
                        <button onClick={() => setShowTransactionsModal(null)} className="text-slate-400 hover:text-white">✕ Fechar</button>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                        {data.transactions
                           .filter((tx: any) => tx.type === showTransactionsModal)
                           .map((tx: any) => (
                              <div key={tx.id} className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                 <div>
                                    <div className="font-semibold text-slate-200">
                                       {CATEGORIES[tx.category] || tx.category} 
                                    </div>
                                    <div className="text-slate-400 text-sm mt-1">{tx.description || "Pagamento Automático"}</div>
                                    <div className="text-xs text-slate-500 font-mono mt-1">Ref: {tx.referenceId || tx.id}</div>
                                 </div>
                                 <div className="flex flex-col sm:items-end text-left sm:text-right">
                                    <span className={`text-lg font-black ${tx.type === "REVENUE" ? "text-emerald-400" : "text-rose-400"}`}>
                                       {formatBRL(Number(tx.amount))}
                                    </span>
                                    <span className="text-xs text-slate-500 mt-1">{new Date(tx.createdAt).toLocaleString("pt-BR")}</span>
                                    
                                    {tx.isSandbox && tx.type === "REVENUE" && (
                                       <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                          Sandbox Tester
                                       </span>
                                    )}
                                    {!tx.isSandbox && tx.type === "REVENUE" && tx.category !== "OTHER" && (
                                       <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                          Dinheiro Real
                                       </span>
                                    )}
                                    {(tx.category === "META_ADS" || tx.category === "GOOGLE_ADS") && tx.type === "EXPENSE" && (
                                       <span className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                          Verba Ad Campaign
                                       </span>
                                    )}
                                 </div>
                              </div>
                           ))}
                        
                        {data.transactions.filter((tx: any) => tx.type === showTransactionsModal).length === 0 && (
                           <div className="text-center py-8 text-slate-500">
                              Nenhuma transação registrada neste período.
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
