"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  DollarSign,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Plus,
  UploadCloud,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Calendar,
  X,
  TrendingUp,
  Percent,
} from "lucide-react";
import { STANDARD_CATEGORIES } from "@/lib/personal-accounting/categorizer";
import { detectFileMetadata, FileMetadataResult } from "@/lib/personal-accounting/competenceDetector";

const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação & Supermercado": "bg-emerald-500",
  "Moradia & Contas": "bg-blue-500",
  "Transporte & Combustível": "bg-amber-500",
  "Saúde & Farmácia": "bg-rose-500",
  "Educação & Cursos": "bg-purple-500",
  "Lazer & Streaming": "bg-pink-500",
  "Compras & Varejo": "bg-indigo-500",
  "Serviços & Assinaturas": "bg-cyan-500",
  "Fatura de Cartão": "bg-teal-500",
  "Investimentos": "bg-emerald-400",
  "Renda / Salário": "bg-green-500",
  "Outros": "bg-slate-500",
};

export default function ContabilidadePessoalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [sourceTypeFilter, setSourceTypeFilter] = useState<"ALL" | "BANK_STATEMENT" | "CREDIT_CARD" | "UPLOADS">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modais
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Estado do Upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadAccountName, setUploadAccountName] = useState("");
  const [uploadSourceType, setUploadSourceType] = useState<"AUTO" | "BANK_STATEMENT" | "CREDIT_CARD">("AUTO");
  const [uploadMonth, setUploadMonth] = useState(new Date().getMonth() + 1);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [uploadResult, setUploadResult] = useState<any>(null);

  const [detectedFilesMeta, setDetectedFilesMeta] = useState<FileMetadataResult[]>([]);

  // Auto-detecta mês, ano e tipo (cartão vs extrato) a partir dos arquivos selecionados
  async function handleFileSelection(files: File[]) {
    setSelectedFiles(files);
    if (!files || files.length === 0) {
      setDetectedFilesMeta([]);
      return;
    }

    const metaList: FileMetadataResult[] = [];

    for (const file of files) {
      let preview = "";
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "ofx" || ext === "csv" || ext === "txt") {
          // Lê primeiros 12KB para detecção instantânea e precisa no navegador
          const slice = file.slice(0, 12000);
          preview = await slice.text();
        }
      } catch (e) {
        console.warn("Não foi possível ler preview do arquivo:", e);
      }

      const meta = detectFileMetadata(file.name, preview);
      metaList.push(meta);
    }

    setDetectedFilesMeta(metaList);

    if (metaList.length > 0) {
      const first = metaList[0];
      setUploadMonth(first.month);
      setUploadYear(first.year);
      setUploadSourceType(first.sourceType);
    }
  }

  // Estado do Lançamento Manual
  const [manualForm, setManualForm] = useState({
    description: "",
    amount: "",
    type: "EXPENSE" as "INCOME" | "EXPENSE",
    category: "Alimentação & Supermercado",
    accountName: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [savingManual, setSavingManual] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated" || (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, month, year, sourceTypeFilter, categoryFilter]);

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        sourceType: sourceTypeFilter === "UPLOADS" ? "ALL" : sourceTypeFilter,
        category: categoryFilter,
      });
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/admin/contabilidade-pessoal?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0) return alert("Selecione pelo menos um arquivo.");

    try {
      setUploading(true);
      setUploadResult(null);
      setUploadProgressText("Lendo arquivos e extraindo lançamentos...");

      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("file", f));
      if (uploadAccountName) formData.append("accountName", uploadAccountName);
      formData.append("sourceType", uploadSourceType);
      formData.append("competenceMonth", String(uploadMonth));
      formData.append("competenceYear", String(uploadYear));

      setUploadProgressText("Processando deduplicação e categorização inteligente...");
      const res = await fetch("/api/admin/contabilidade-pessoal/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setUploadResult(json);
        setSelectedFiles([]);
        setUploadAccountName("");
        if (json.results?.[0]?.competenceMonth) {
          setMonth(json.results[0].competenceMonth);
          setYear(json.results[0].competenceYear);
        }
        fetchData();
      } else {
        alert("Erro no upload: " + (json.error || "Falha ao processar arquivo."));
      }
    } catch (err: any) {
      alert("Erro ao enviar: " + err?.message);
    } finally {
      setUploading(false);
      setUploadProgressText("");
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualForm.description || !manualForm.amount) return alert("Preencha todos os campos.");

    try {
      setSavingManual(true);
      const res = await fetch("/api/admin/contabilidade-pessoal/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });
      const json = await res.json();
      if (json.success) {
        setShowManualModal(false);
        setManualForm({
          description: "",
          amount: "",
          type: "EXPENSE",
          category: "Alimentação & Supermercado",
          accountName: "",
          date: new Date().toISOString().slice(0, 10),
        });
        fetchData();
      } else {
        alert("Erro: " + json.error);
      }
    } catch (err) {
      alert("Erro ao salvar lançamento manual.");
    } finally {
      setSavingManual(false);
    }
  }

  async function handleUpdateCategory(txId: string, newCategory: string) {
    try {
      const res = await fetch(`/api/admin/contabilidade-pessoal/transaction/${txId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      if (res.ok) {
        setData((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            transactions: prev.transactions.map((t: any) => (t.id === txId ? { ...t, category: newCategory } : t)),
          };
        });
        fetchData();
      }
    } catch (err) {
      console.error("Erro ao atualizar categoria", err);
    }
  }

  async function handleDeleteTransaction(txId: string) {
    if (!confirm("Tem certeza que deseja excluir esta transação?")) return;
    try {
      const res = await fetch(`/api/admin/contabilidade-pessoal/transaction/${txId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert("Erro ao excluir transação.");
    }
  }

  async function handleDeleteUpload(uploadId: string) {
    if (!confirm("Deseja excluir este lote? Todas as transações importadas deste arquivo serão removidas.")) return;
    try {
      const res = await fetch(`/api/admin/contabilidade-pessoal/upload/${uploadId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert("Erro ao excluir lote.");
    }
  }

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    let list = [...data.transactions];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.accountName?.toLowerCase().includes(q) ||
          t.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data?.transactions, searchTerm]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 sm:px-6 pt-24 pb-16 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* TOP TAB SWITCHER: Corporativo vs Pessoal */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/contabilidade"
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white transition"
            >
              🏢 Plataforma RealStock (SaaS)
            </Link>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400 shadow-sm">
              👤 Minha Contabilidade Pessoal
            </div>
          </div>

          <Link href="/admin" className="text-xs text-slate-400 hover:text-white transition">
            ← Voltar ao Painel Admin
          </Link>
        </div>

        {/* HEADER & CONTROLES */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Wallet className="h-6 w-6" />
              </div>
              Contabilidade Pessoal
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Importação de extratos e cartões com classificação automática e inteligência artificial
            </p>
          </div>

          {/* Seletor de Período e Botões */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 p-2 rounded-2xl">
              <Calendar size={16} className="text-slate-400 ml-1" />
              <select
                className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(0, m - 1).toLocaleString("pt-BR", { month: "long" }).toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                className="bg-slate-800 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none cursor-pointer"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowManualModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-white/10 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus size={15} />
              Manual
            </button>

            <button
              onClick={() => {
                setUploadResult(null);
                setUploadMonth(month);
                setUploadYear(year);
                setShowUploadModal(true);
              }}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
            >
              <UploadCloud size={16} />
              Subir Extrato ou Cartão
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Receitas */}
          <div className="bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-950 border border-emerald-500/20 p-5 rounded-3xl shadow-xl flex items-center gap-4">
            <div className="w-13 h-13 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
              <ArrowUpRight size={26} />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total de Receitas</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {formatBRL(data?.summary?.totalIncome || 0)}
              </div>
            </div>
          </div>

          {/* Cartão de Crédito */}
          <div className="bg-gradient-to-br from-indigo-500/15 via-slate-900 to-slate-950 border border-indigo-500/20 p-5 rounded-3xl shadow-xl flex items-center gap-4">
            <div className="w-13 h-13 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0">
              <CreditCard size={26} />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Gastos no Cartão</div>
              <div className="text-xl font-black text-indigo-400 mt-0.5">
                {formatBRL(data?.summary?.totalCreditCardExpenses || 0)}
              </div>
            </div>
          </div>

          {/* Extrato Bancário */}
          <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/20 p-5 rounded-3xl shadow-xl flex items-center gap-4">
            <div className="w-13 h-13 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
              <ArrowDownRight size={26} />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Débitos no Extrato</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">
                {formatBRL(data?.summary?.totalBankExpenses || 0)}
              </div>
            </div>
          </div>

          {/* Saldo Líquido */}
          <div
            className={`p-5 rounded-3xl border shadow-xl flex items-center gap-4 bg-gradient-to-br ${
              (data?.summary?.netBalance || 0) >= 0
                ? "from-teal-500/20 via-slate-900 to-slate-950 border-teal-500/30"
                : "from-rose-500/20 via-slate-900 to-slate-950 border-rose-500/30"
            }`}
          >
            <div
              className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 ${
                (data?.summary?.netBalance || 0) >= 0
                  ? "bg-teal-500/20 text-teal-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
            >
              <Activity size={26} />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                <span>Saldo Líquido</span>
                {data?.summary?.savingsRate !== undefined && data.summary.totalIncome > 0 && (
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white font-mono">
                    {data.summary.savingsRate}%
                  </span>
                )}
              </div>
              <div
                className={`text-xl font-black mt-0.5 ${
                  (data?.summary?.netBalance || 0) >= 0 ? "text-teal-400" : "text-rose-400"
                }`}
              >
                {formatBRL(data?.summary?.netBalance || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* RECONCILIAÇÃO INTELIGENTE DE FATURA (QUANDO HOUVER EXTRATO + CARTÃO) */}
        {data?.summary?.totalCardInvoicePayments > 0 && data?.summary?.totalCreditCardExpenses > 0 && (
          <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-emerald-950/40 border border-indigo-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-xl">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <CreditCard size={20} />
              </div>
              <div>
                <div className="font-black text-white text-sm flex items-center gap-2">
                  <span>Reconciliação Automática de Fatura Ativa</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Sem Duplicidade
                  </span>
                </div>
                <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">
                  O débito de pagamento da fatura (<strong className="text-white">{formatBRL(data.summary.totalCardInvoicePayments)}</strong>) no extrato foi substituído pelos lançamentos individuais do cartão (<strong className="text-indigo-400">{formatBRL(data.summary.totalCreditCardExpenses)}</strong>), garantindo categorização detalhada sem contar duas vezes.
                </p>
              </div>
            </div>
            <div className="text-right sm:shrink-0 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Total Despesas Reais</div>
              <div className="text-base font-black text-white">{formatBRL(data.summary.totalExpenses)}</div>
            </div>
          </div>
        )}

        {/* SEÇÃO GRÁFICA & ANÁLISE DE CATEGORIAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribuição por Categoria */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2 text-white">
                <TrendingUp size={18} className="text-emerald-400" />
                Gastos por Categoria
              </h2>
              <span className="text-xs text-slate-400">
                Total de Despesas: <strong className="text-white">{formatBRL(data?.summary?.totalExpenses || 0)}</strong>
              </span>
            </div>

            {data?.categoryBreakdown && data.categoryBreakdown.length > 0 ? (
              <div className="space-y-3 pt-2">
                {data.categoryBreakdown.map((cat: any) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat.category] || "bg-slate-400"}`} />
                        {cat.category}
                        <span className="text-[10px] text-slate-500 font-normal">({cat.count} lançamentos)</span>
                      </span>
                      <span className="font-mono font-bold text-white flex items-center gap-2">
                        <span>{formatBRL(cat.amount)}</span>
                        <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                          {cat.percentage}%
                        </span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-950">
                      <div
                        className={`h-full rounded-full ${CATEGORY_COLORS[cat.category] || "bg-emerald-500"}`}
                        style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">
                Nenhuma despesa categorizada neste período. Suba um extrato para visualizar o gráfico.
              </div>
            )}
          </div>

          {/* Maiores Despesas e Contas */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-bold flex items-center gap-2 text-white">
              <Activity size={18} className="text-rose-400" />
              Maiores Gastos do Mês
            </h2>

            {data?.topExpenses && data.topExpenses.length > 0 ? (
              <div className="space-y-2.5">
                {data.topExpenses.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-200 truncate">{t.description}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{new Date(t.date).toLocaleDateString("pt-BR")}</span>
                        <span>•</span>
                        <span className="truncate text-emerald-400/80">{t.category}</span>
                      </div>
                    </div>
                    <div className="font-mono font-black text-rose-400 whitespace-nowrap">
                      {formatBRL(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-500">
                Sem despesas registradas.
              </div>
            )}

            {/* Origem por Banco / Cartão */}
            {data?.accountBreakdown && data.accountBreakdown.length > 0 && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Instituições / Contas
                </div>
                <div className="space-y-1.5">
                  {data.accountBreakdown.map((acc: any) => (
                    <div key={acc.accountName} className="flex justify-between items-center text-xs text-slate-300">
                      <span className="flex items-center gap-1.5">
                        {acc.sourceType === "CREDIT_CARD" ? (
                          <CreditCard size={13} className="text-indigo-400" />
                        ) : (
                          <Wallet size={13} className="text-emerald-400" />
                        )}
                        <span>{acc.accountName}</span>
                      </span>
                      <span className="font-mono text-white font-bold">{formatBRL(acc.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TABS DE FILTRO E TABELA DE LANÇAMENTOS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-900 border border-white/10 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setSourceTypeFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  sourceTypeFilter === "ALL" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                Todas ({data?.summary?.transactionsCount || 0})
              </button>
              <button
                onClick={() => setSourceTypeFilter("CREDIT_CARD")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  sourceTypeFilter === "CREDIT_CARD" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                💳 Apenas Cartão
              </button>
              <button
                onClick={() => setSourceTypeFilter("BANK_STATEMENT")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  sourceTypeFilter === "BANK_STATEMENT" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                🏦 Apenas Extrato
              </button>
              <button
                onClick={() => setSourceTypeFilter("UPLOADS")}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  sourceTypeFilter === "UPLOADS" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                📁 Arquivos Importados ({data?.recentUploads?.length || 0})
              </button>
            </div>

            {/* Busca e Filtro de Categoria */}
            {sourceTypeFilter !== "UPLOADS" && (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar lançamento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none w-48 sm:w-56"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="ALL">Todas as Categorias</option>
                  {STANDARD_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* CONTEÚDO: TABELA OU LISTA DE ARQUIVOS */}
          {sourceTypeFilter === "UPLOADS" ? (
            /* LISTA DE ARQUIVOS IMPORTADOS */
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" />
                Histórico de Arquivos Processados
              </h3>

              {data?.recentUploads && data.recentUploads.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {data.recentUploads.map((up: any) => (
                    <div key={up.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-[10px] text-emerald-400 uppercase">
                          {up.fileType}
                        </div>
                        <div>
                          <div className="font-bold text-white">{up.filename}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2">
                            <span>{up.accountName || "Conta"}</span>
                            <span>•</span>
                            <span>{up.transactionsCount} transações</span>
                            <span>•</span>
                            <span>{new Date(up.createdAt).toLocaleString("pt-BR")}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteUpload(up.id)}
                        className="text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition cursor-pointer flex items-center gap-1 text-[11px]"
                        title="Excluir este lote e suas transações"
                      >
                        <Trash2 size={14} />
                        <span>Excluir Lote</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-500">
                  Nenhum arquivo enviado até o momento.
                </div>
              )}
            </div>
          ) : (
            /* TABELA DE TRANSAÇÕES */
            <div className="bg-slate-900/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3.5 px-4">Data</th>
                      <th className="py-3.5 px-4">Descrição</th>
                      <th className="py-3.5 px-4">Conta / Cartão</th>
                      <th className="py-3.5 px-4">Categoria</th>
                      <th className="py-3.5 px-4 text-right">Valor</th>
                      <th className="py-3.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          <Loader2 size={24} className="animate-spin mx-auto text-emerald-400 mb-2" />
                          Carregando lançamentos...
                        </td>
                      </tr>
                    ) : filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          Nenhuma transação encontrada para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            <div className="text-slate-200">{new Date(tx.date).toLocaleDateString("pt-BR")}</div>
                            {tx.purchaseDate && tx.sourceType === "CREDIT_CARD" && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Compra: {new Date(tx.purchaseDate).toLocaleDateString("pt-BR")}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-medium text-white max-w-sm">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{tx.description}</span>
                              {tx.installment && (
                                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                  {tx.installment}
                                </span>
                              )}
                              {tx.sourceType === "CREDIT_CARD" && tx.competenceMonth && (
                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                  Fatura {String(tx.competenceMonth).padStart(2, "0")}/{tx.competenceYear}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              {tx.sourceType === "CREDIT_CARD" ? (
                                <CreditCard size={13} className="text-indigo-400" />
                              ) : (
                                <Wallet size={13} className="text-emerald-400" />
                              )}
                              <span>{tx.accountName || "Principal"}</span>
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <select
                              value={tx.category}
                              onChange={(e) => handleUpdateCategory(tx.id, e.target.value)}
                              className="bg-slate-950 border border-white/10 text-slate-200 text-xs rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-emerald-500/50"
                            >
                              {STANDARD_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                            <span className={tx.type === "INCOME" ? "text-emerald-400" : "text-rose-400"}>
                              {tx.type === "INCOME" ? "+" : "-"} {formatBRL(tx.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                              title="Excluir lançamento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* MODAL DE UPLOAD DE EXTRATO / CARTÃO */}
        {showUploadModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Subir Extratos e Cartões</h3>
                    <p className="text-xs text-slate-400">Processamento e categorização automática</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {!uploadResult ? (
                <form onSubmit={handleUpload} className="space-y-4">
                  {/* Drag and Drop Zone */}
                  <div className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-6 text-center bg-emerald-500/5 transition cursor-pointer relative">
                    <input
                      type="file"
                      multiple
                      accept=".ofx,.csv,.pdf,.txt"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleFileSelection(Array.from(e.target.files));
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
                    <div className="text-xs font-bold text-white">
                      {selectedFiles.length > 0
                        ? `${selectedFiles.length} arquivo(s) selecionado(s)`
                        : "Clique ou arraste seus arquivos aqui"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Formatos aceitos: <strong>.OFX</strong>, <strong>.PDF</strong>, <strong>.CSV</strong> e <strong>.TXT</strong>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="mt-4 space-y-2 text-left bg-black/60 p-3 rounded-2xl border border-white/10 max-h-48 overflow-y-auto">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-white/5">
                          <span>Arquivos & Identificação Automática ({selectedFiles.length})</span>
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                            Detectado
                          </span>
                        </div>
                        {selectedFiles.map((f, i) => {
                          const meta = detectedFilesMeta[i];
                          const ext = f.name.split(".").pop()?.toUpperCase() || "ARQ";
                          const isCard = meta?.sourceType === "CREDIT_CARD";

                          return (
                            <div
                              key={i}
                              className="bg-slate-900/90 border border-white/10 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white/10 text-slate-200 font-mono shrink-0">
                                  {ext}
                                </span>
                                <span className="text-xs font-semibold text-white truncate max-w-xs" title={f.name}>
                                  {f.name}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                  ({(f.size / 1024).toFixed(0)} KB)
                                </span>
                              </div>

                              {meta ? (
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-[11px]">
                                  <span
                                    className={`px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border ${
                                      isCard
                                        ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                        : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                    }`}
                                  >
                                    {isCard ? <CreditCard size={12} /> : <Wallet size={12} />}
                                    {meta.sourceTypeLabel}
                                  </span>

                                  <span className="px-2 py-0.5 rounded-lg font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {meta.periodLabel}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Analisando...</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Mês de Referência (Detectado)</label>
                      <select
                        value={uploadMonth}
                        onChange={(e) => setUploadMonth(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(0, m - 1).toLocaleString("pt-BR", { month: "long" }).toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Ano de Referência (Detectado)</label>
                      <select
                        value={uploadYear}
                        onChange={(e) => setUploadYear(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                      >
                        {[2024, 2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Apelido da Conta / Cartão</label>
                      <input
                        type="text"
                        placeholder="Ex: Nubank, Itaú Visa, Banco do Brasil"
                        value={uploadAccountName}
                        onChange={(e) => setUploadAccountName(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-bold mb-1">Tipo de Documento</label>
                      <select
                        value={uploadSourceType}
                        onChange={(e) => setUploadSourceType(e.target.value as any)}
                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                      >
                        <option value="AUTO">Identificação Automática (Recomendado)</option>
                        <option value="BANK_STATEMENT">Extrato Bancário (Conta)</option>
                        <option value="CREDIT_CARD">Fatura de Cartão de Crédito</option>
                      </select>
                    </div>
                  </div>

                  {uploading && (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs text-emerald-200 animate-pulse">
                      <Loader2 size={16} className="animate-spin text-emerald-400 shrink-0" />
                      <span>{uploadProgressText || "Processando arquivo..."}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploading || selectedFiles.length === 0}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-black text-xs text-white shadow-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {uploading ? "Importando e Classificando..." : "Iniciar Importação Automática"}
                  </button>
                </form>
              ) : (
                /* RESULTADO PÓS UPLOAD */
                <div className="space-y-4 text-xs">
                  <div className="text-center space-y-1">
                    <CheckCircle2 size={40} className="text-emerald-400 mx-auto" />
                    <h4 className="text-base font-black text-white">Importação Concluída com Sucesso!</h4>
                    <p className="text-slate-400">
                      O sistema processou os arquivos e atualizou seu balanço financeiro.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/10 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Novos lançamentos importados:</span>
                      <strong className="text-emerald-400 font-mono">
                        {uploadResult.summary?.totalImported || 0}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lançamentos repetidos ignorados:</span>
                      <strong className="text-amber-400 font-mono">
                        {uploadResult.summary?.totalDuplicatesSkipped || 0}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Arquivos processados:</span>
                      <strong className="text-white font-mono">
                        {uploadResult.summary?.filesProcessed || 0}
                      </strong>
                    </div>
                  </div>

                  {Array.isArray(uploadResult.results) && uploadResult.results.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Detalhamento por Arquivo:
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {uploadResult.results.map((r: any, idx: number) => {
                          const isCard = r.sourceType === "CREDIT_CARD";
                          return (
                            <div
                              key={idx}
                              className="bg-slate-900 border border-white/10 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                            >
                              <div className="truncate max-w-xs font-semibold text-white">
                                {r.filename}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                    isCard
                                      ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                                  }`}
                                >
                                  {r.sourceTypeLabel || (isCard ? "Cartão" : "Extrato")}
                                </span>
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  {r.periodLabel || `${r.competenceMonth}/${r.competenceYear}`}
                                </span>
                                <span className="text-[11px] text-emerald-400 font-bold font-mono">
                                  +{r.imported} novos
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-xs text-white shadow-lg transition cursor-pointer"
                  >
                    OK, Ver Meus Lançamentos
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DE LANÇAMENTO MANUAL */}
        {showManualModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Plus size={16} className="text-emerald-400" />
                  Novo Lançamento Manual
                </h3>
                <button
                  onClick={() => setShowManualModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Tipo de Lançamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualForm({ ...manualForm, type: "EXPENSE" })}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition ${
                        manualForm.type === "EXPENSE"
                          ? "bg-rose-500 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Despesa / Saída
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualForm({ ...manualForm, type: "INCOME" })}
                      className={`py-2 rounded-xl font-bold cursor-pointer transition ${
                        manualForm.type === "INCOME"
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Receita / Entrada
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Padaria do Bairro, Aluguel, etc."
                    value={manualForm.description}
                    onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Data</label>
                    <input
                      type="date"
                      required
                      value={manualForm.date}
                      onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Categoria</label>
                  <select
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
                  >
                    {STANDARD_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Conta / Forma de Pagamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Dinheiro Vivo, Carteira"
                    value={manualForm.accountName}
                    onChange={(e) => setManualForm({ ...manualForm, accountName: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingManual}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white transition cursor-pointer mt-2"
                >
                  {savingManual ? "Salvando..." : "Salvar Lançamento"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
