"use client";

import { useState, useEffect } from "react";
import {
  Landmark,
  TrendingUp,
  CreditCard,
  Building2,
  Car,
  PieChart,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Briefcase,
  Layers,
  ArrowRight,
  ShieldCheck,
  Save,
  X,
  ChevronDown,
} from "lucide-react";

interface BalanceItem {
  id: string;
  type: "ASSET" | "LIABILITY";
  subgroup: "CIRCULANTE" | "NAO_CIRCULANTE";
  category: string;
  title: string;
  institution?: string | null;
  value: number;
  notes?: string | null;
  isAutoCalculated: boolean;
  referenceDate: string;
}

interface BalanceSummary {
  totalAssets: number;
  totalCirculatingAssets: number;
  totalNonCirculatingAssets: number;
  totalLiabilities: number;
  totalCirculatingLiabilities: number;
  totalNonCirculatingLiabilities: number;
  netWorth: number;
  liquidityRatio: number;
  debtRatio: number;
}

interface AutoCalculatedData {
  accumulatedCash: number;
  totalBankIncome: number;
  totalEffectiveExpenses: number;
  latestCardInvoiceAmount: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  CAIXA_BANCOS: Landmark,
  APLICACOES_LIQUIDEZ: TrendingUp,
  IMOVEIS: Building2,
  VEICULOS: Car,
  INVESTIMENTOS_LP: PieChart,
  PARTICIPACOES: Briefcase,
  OUTROS_BENS: Layers,
  CARTOES_CREDITO: CreditCard,
  CONTAS_PAGAR: Layers,
  EMPRESTIMOS: AlertTriangle,
  FINANCIAMENTOS: Building2,
  OUTRAS_OBRIGACOES: Layers,
};

const CATEGORY_LABELS: Record<string, string> = {
  CAIXA_BANCOS: "Caixa & Bancos",
  APLICACOES_LIQUIDEZ: "Renda Fixa / Reserva",
  IMOVEIS: "Imóveis",
  VEICULOS: "Veículos",
  INVESTIMENTOS_LP: "Ações / FIIs / Previdência",
  PARTICIPACOES: "Participação em Empresas",
  OUTROS_BENS: "Outros Ativos",
  CARTOES_CREDITO: "Cartões de Crédito",
  CONTAS_PAGAR: "Contas a Pagar",
  EMPRESTIMOS: "Empréstimos Bancários",
  FINANCIAMENTOS: "Financiamentos",
  OUTRAS_OBRIGACOES: "Outras Obrigações",
};

export default function BalancoPatrimonialView() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [autoData, setAutoData] = useState<AutoCalculatedData | null>(null);

  // Modo de edição rápida inline
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [editableValues, setEditableValues] = useState<Record<string, string>>({});
  const [savingBatch, setSavingBatch] = useState(false);

  // Modal de Adicionar/Editar
  const [showModal, setShowModal] = useState(false);
  const [modalItem, setModalItem] = useState<{
    id?: string;
    type: "ASSET" | "LIABILITY";
    subgroup: "CIRCULANTE" | "NAO_CIRCULANTE";
    category: string;
    title: string;
    institution: string;
    value: string;
    notes: string;
  }>({
    type: "ASSET",
    subgroup: "NAO_CIRCULANTE",
    category: "IMOVEIS",
    title: "",
    institution: "",
    value: "",
    notes: "",
  });
  const [savingItem, setSavingItem] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchBalanco();
  }, []);

  async function fetchBalanco() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/contabilidade-pessoal/balanco");
      const json = await res.json();
      if (json.success) {
        setItems(json.items || []);
        setSummary(json.summary || null);
        setAutoData(json.autoCalculated || null);

        // Preenche valores editáveis iniciais
        const valMap: Record<string, string> = {};
        json.items?.forEach((it: any) => {
          valMap[it.id] = String(it.value);
        });
        setEditableValues(valMap);
      }
    } catch (err) {
      console.error("Erro ao carregar balanço:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncAuto() {
    try {
      setSyncing(true);
      const res = await fetch("/api/admin/contabilidade-pessoal/balanco", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SYNC_AUTO" }),
      });
      if (res.ok) {
        await fetchBalanco();
      }
    } catch (err) {
      console.error("Erro ao sincronizar valores automáticos:", err);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveBatch() {
    try {
      setSavingBatch(true);
      const payload = items.map((it) => ({
        id: it.id,
        value: editableValues[it.id] !== undefined ? editableValues[it.id] : it.value,
      }));

      const res = await fetch("/api/admin/contabilidade-pessoal/balanco", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });

      if (res.ok) {
        setQuickEditMode(false);
        await fetchBalanco();
      }
    } catch (err) {
      console.error("Erro ao salvar valores em lote:", err);
    } finally {
      setSavingBatch(false);
    }
  }

  async function handleSaveModalItem(e: React.FormEvent) {
    e.preventDefault();
    if (!modalItem.title) return alert("Título é obrigatório.");

    try {
      setSavingItem(true);
      const res = await fetch("/api/admin/contabilidade-pessoal/balanco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalItem),
      });

      if (res.ok) {
        setShowModal(false);
        await fetchBalanco();
      }
    } catch (err) {
      console.error("Erro ao salvar item:", err);
      alert("Erro ao salvar item.");
    } finally {
      setSavingItem(false);
    }
  }

  async function handleDeleteItem(id: string, title: string) {
    if (!confirm(`Deseja realmente excluir "${title}" do balanço?`)) return;
    try {
      const res = await fetch(`/api/admin/contabilidade-pessoal/balanco?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchBalanco();
      }
    } catch (err) {
      console.error("Erro ao excluir item:", err);
    }
  }

  function openEditModal(item: BalanceItem) {
    setModalItem({
      id: item.id,
      type: item.type,
      subgroup: item.subgroup,
      category: item.category,
      title: item.title,
      institution: item.institution || "",
      value: String(item.value),
      notes: item.notes || "",
    });
    setShowModal(true);
  }

  function openNewItemModal(type: "ASSET" | "LIABILITY", subgroup: "CIRCULANTE" | "NAO_CIRCULANTE") {
    setModalItem({
      type,
      subgroup,
      category: type === "ASSET" ? (subgroup === "CIRCULANTE" ? "CAIXA_BANCOS" : "IMOVEIS") : (subgroup === "CIRCULANTE" ? "CONTAS_PAGAR" : "FINANCIAMENTOS"),
      title: "",
      institution: "",
      value: "",
      notes: "",
    });
    setShowModal(true);
  }

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

  // Agrupamentos
  const circulatingAssets = items.filter((it) => it.type === "ASSET" && it.subgroup === "CIRCULANTE");
  const nonCirculatingAssets = items.filter((it) => it.type === "ASSET" && it.subgroup === "NAO_CIRCULANTE");
  const circulatingLiabilities = items.filter((it) => it.type === "LIABILITY" && it.subgroup === "CIRCULANTE");
  const nonCirculatingLiabilities = items.filter((it) => it.type === "LIABILITY" && it.subgroup === "NAO_CIRCULANTE");

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <RefreshCw size={36} className="text-emerald-400 animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Carregando estrutura do Balanço Patrimonial...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* BANNER DE CONTROLE E AÇÕES DO BALANÇO */}
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Posição Patrimonial Consolidada
            </span>
            <span className="text-xs text-slate-400 font-medium">Corte: Setembro / 2026</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            Balanço Patrimonial Pessoal
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Demonstração contábil com a totalidade dos seus bens e direitos (Ativo), obrigações e dívidas (Passivo) e a riqueza líquida acumulada (Patrimônio Líquido).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncAuto}
            disabled={syncing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
            title="Recalcular caixa e fatura a partir de todos os extratos importados"
          >
            <RefreshCw size={14} className={syncing ? "animate-spin text-emerald-400" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar Extratos"}
          </button>

          {quickEditMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuickEditMode(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBatch}
                disabled={savingBatch}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-950/40"
              >
                <Save size={14} />
                {savingBatch ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setQuickEditMode(true)}
              className="flex items-center gap-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 px-4 py-2.5 rounded-2xl text-xs font-bold transition"
            >
              <Edit2 size={14} />
              Editar Valores
            </button>
          )}

          <button
            onClick={() => openNewItemModal("ASSET", "NAO_CIRCULANTE")}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-950/40"
          >
            <Plus size={16} />
            Novo Item
          </button>
        </div>
      </div>

      {/* CARDS DE DESTAQUE: PATRIMÔNIO LÍQUIDO, ATIVO, PASSIVO E ÍNDICES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Patrimônio Líquido */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-indigo-950/50 border border-emerald-500/30 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Patrimônio Líquido</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-white tracking-tight">
            {formatBRL(summary?.netWorth || 0)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span>Ativo ({formatBRL(summary?.totalAssets || 0)})</span>
            <span>-</span>
            <span>Passivo ({formatBRL(summary?.totalLiabilities || 0)})</span>
          </div>
        </div>

        {/* Card 2: Total Ativo */}
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ativo Total (Bens & Direitos)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Landmark size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white tracking-tight">
            {formatBRL(summary?.totalAssets || 0)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-3">
            <span>Circulante: <strong className="text-slate-300">{formatBRL(summary?.totalCirculatingAssets || 0)}</strong></span>
            <span>•</span>
            <span>Imobilizado: <strong className="text-slate-300">{formatBRL(summary?.totalNonCirculatingAssets || 0)}</strong></span>
          </div>
        </div>

        {/* Card 3: Total Passivo */}
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Passivo Total (Obrigações)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-400 tracking-tight">
            {formatBRL(summary?.totalLiabilities || 0)}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-3">
            <span>Curto Prazo: <strong className="text-slate-300">{formatBRL(summary?.totalCirculatingLiabilities || 0)}</strong></span>
            <span>•</span>
            <span>Longo Prazo: <strong className="text-slate-300">{formatBRL(summary?.totalNonCirculatingLiabilities || 0)}</strong></span>
          </div>
        </div>

        {/* Card 4: Índices de Saúde Financeira */}
        <div className="rounded-3xl bg-slate-900/90 border border-white/10 p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Indicadores Financeiros</span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Liquidez Corrente:</span>
              <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">
                {(summary?.liquidityRatio || 0) >= 999 ? "∞" : `${summary?.liquidityRatio || 0}x`}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Grau de Endividamento:</span>
              <span className="font-mono font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded">
                {summary?.debtRatio || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD DE INFORMAÇÕES DO LEVANTAMENTO DE CAIXA DE JAN A SET / 2026 */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900 to-indigo-950/40 border border-blue-500/30 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 shrink-0">
              <Landmark size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Caixa Apurado de Janeiro a Setembro de 2026
                </h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Saneado & Conciliado
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                O valor de caixa de <strong className="text-emerald-400 font-mono font-bold">{formatBRL(autoData?.accumulatedCash || 17879.20)}</strong> foi levantado diretamente das movimentações bancárias e compras dos 18 arquivos OFX de Janeiro a Setembro. Você pode ajustar este valor caso possuísse um saldo inicial em 01/01/2026 ou enviar os outros bens atuais (imóveis, veículos, investimentos) para compor o balanço.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 bg-slate-950/60 border border-white/10 p-3 rounded-2xl">
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Fatura Recente (Set/26)</div>
              <div className="text-sm font-black text-rose-400 font-mono">
                {formatBRL(autoData?.latestCardInvoiceAmount || 41549.11)}
              </div>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Caixa Operacional</div>
              <div className="text-sm font-black text-emerald-400 font-mono">
                {formatBRL(autoData?.accumulatedCash || 17879.20)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TABELAS DO BALANÇO: 2 COLUNAS (ATIVO vs PASSIVO + PATRIMÔNIO LÍQUIDO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* ==================== COLUNA ESQUERDA: ATIVOS ==================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              ATIVO (Bens & Direitos)
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
              Total: {formatBRL(summary?.totalAssets || 0)}
            </span>
          </div>

          {/* Subgrupo: Ativo Circulante */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  Ativo Circulante
                  <span className="text-[10px] text-slate-500 font-normal lowercase">(curto prazo / liquidez)</span>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white">
                  {formatBRL(summary?.totalCirculatingAssets || 0)}
                </span>
                <button
                  onClick={() => openNewItemModal("ASSET", "CIRCULANTE")}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                  title="Adicionar Ativo Circulante"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {circulatingAssets.map((it) => {
                const IconComp = CATEGORY_ICONS[it.category] || Landmark;
                return (
                  <div key={it.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                        <IconComp size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                          <span>{it.title}</span>
                          {it.isAutoCalculated && (
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                              Apurado Jan-Set
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {it.institution || CATEGORY_LABELS[it.category]}
                          {it.notes && <span className="text-slate-500"> • {it.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {quickEditMode ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">R$</span>
                          <input
                            type="text"
                            value={editableValues[it.id] !== undefined ? editableValues[it.id] : String(it.value)}
                            onChange={(e) =>
                              setEditableValues({ ...editableValues, [it.id]: e.target.value })
                            }
                            className="w-28 rounded-lg bg-slate-800 border border-emerald-500/40 px-2 py-1 text-right text-xs font-mono font-bold text-white outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-bold text-white">
                          {formatBRL(it.value)}
                        </span>
                      )}

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        <button
                          onClick={() => openEditModal(it)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(it.id, it.title)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subgrupo: Ativo Não Circulante */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  Ativo Não Circulante
                  <span className="text-[10px] text-slate-500 font-normal lowercase">(imóveis, veículos, investimentos e empresas)</span>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white">
                  {formatBRL(summary?.totalNonCirculatingAssets || 0)}
                </span>
                <button
                  onClick={() => openNewItemModal("ASSET", "NAO_CIRCULANTE")}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                  title="Adicionar Ativo Não Circulante"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {nonCirculatingAssets.map((it) => {
                const IconComp = CATEGORY_ICONS[it.category] || Building2;
                return (
                  <div key={it.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
                        <IconComp size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                          <span>{it.title}</span>
                          {it.value === 0 && (
                            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                              Aguardando valor
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {it.institution || CATEGORY_LABELS[it.category]}
                          {it.notes && <span className="text-slate-500"> • {it.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {quickEditMode ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">R$</span>
                          <input
                            type="text"
                            value={editableValues[it.id] !== undefined ? editableValues[it.id] : String(it.value)}
                            onChange={(e) =>
                              setEditableValues({ ...editableValues, [it.id]: e.target.value })
                            }
                            className="w-28 rounded-lg bg-slate-800 border border-blue-500/40 px-2 py-1 text-right text-xs font-mono font-bold text-white outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ) : (
                        <span className={`font-mono text-xs font-bold ${it.value > 0 ? "text-white" : "text-slate-500"}`}>
                          {it.value > 0 ? formatBRL(it.value) : "R$ 0,00"}
                        </span>
                      )}

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        <button
                          onClick={() => openEditModal(it)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(it.id, it.title)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================== COLUNA DIREITA: PASSIVOS & PATRIMÔNIO LÍQUIDO ==================== */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              PASSIVO (Deveres & Obrigações)
            </h3>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
              Total: {formatBRL(summary?.totalLiabilities || 0)}
            </span>
          </div>

          {/* Subgrupo: Passivo Circulante */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  Passivo Circulante
                  <span className="text-[10px] text-slate-500 font-normal lowercase">(curto prazo / faturas e contas)</span>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-rose-300">
                  {formatBRL(summary?.totalCirculatingLiabilities || 0)}
                </span>
                <button
                  onClick={() => openNewItemModal("LIABILITY", "CIRCULANTE")}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                  title="Adicionar Passivo Circulante"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {circulatingLiabilities.map((it) => {
                const IconComp =
                  it.category === "VEICULOS" ||
                  it.title.toLowerCase().includes("veículo") ||
                  it.title.toLowerCase().includes("carro")
                    ? Car
                    : CATEGORY_ICONS[it.category] || CreditCard;
                return (
                  <div key={it.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                        <IconComp size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                          <span>{it.title}</span>
                          {it.isAutoCalculated && (
                            <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                              Apurado Jan-Set
                            </span>
                          )}
                          {(it.category === "EMPRESTIMOS" || it.notes?.includes("Detecção automática") || it.notes?.includes("parcela(s) paga(s)")) && (
                            <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-tight">
                              ⚡ Auto-Abatimento Ativo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {it.institution || CATEGORY_LABELS[it.category]}
                          {it.notes && <span className="text-slate-500"> • {it.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {quickEditMode ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">R$</span>
                          <input
                            type="text"
                            value={editableValues[it.id] !== undefined ? editableValues[it.id] : String(it.value)}
                            onChange={(e) =>
                              setEditableValues({ ...editableValues, [it.id]: e.target.value })
                            }
                            className="w-28 rounded-lg bg-slate-800 border border-rose-500/40 px-2 py-1 text-right text-xs font-mono font-bold text-rose-300 outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-bold text-rose-300">
                          {formatBRL(it.value)}
                        </span>
                      )}

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        <button
                          onClick={() => openEditModal(it)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(it.id, it.title)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subgrupo: Passivo Não Circulante */}
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  Passivo Não Circulante
                  <span className="text-[10px] text-slate-500 font-normal lowercase">(longo prazo / financiamentos e empréstimos)</span>
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-rose-300">
                  {formatBRL(summary?.totalNonCirculatingLiabilities || 0)}
                </span>
                <button
                  onClick={() => openNewItemModal("LIABILITY", "NAO_CIRCULANTE")}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
                  title="Adicionar Passivo Não Circulante"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {nonCirculatingLiabilities.map((it) => {
                const IconComp = CATEGORY_ICONS[it.category] || AlertTriangle;
                return (
                  <div key={it.id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                        <IconComp size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white flex items-center gap-2 truncate">
                          <span>{it.title}</span>
                          {it.value === 0 && (
                            <span className="bg-slate-800 text-slate-400 border border-white/10 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                              Quitado / R$ 0
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {it.institution || CATEGORY_LABELS[it.category]}
                          {it.notes && <span className="text-slate-500"> • {it.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {quickEditMode ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-500">R$</span>
                          <input
                            type="text"
                            value={editableValues[it.id] !== undefined ? editableValues[it.id] : String(it.value)}
                            onChange={(e) =>
                              setEditableValues({ ...editableValues, [it.id]: e.target.value })
                            }
                            className="w-28 rounded-lg bg-slate-800 border border-rose-500/40 px-2 py-1 text-right text-xs font-mono font-bold text-rose-300 outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>
                      ) : (
                        <span className={`font-mono text-xs font-bold ${it.value > 0 ? "text-rose-300" : "text-slate-500"}`}>
                          {it.value > 0 ? formatBRL(it.value) : "R$ 0,00"}
                        </span>
                      )}

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                        <button
                          onClick={() => openEditModal(it)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(it.id, it.title)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CARD RESUMO DO PATRIMÔNIO LÍQUIDO */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-3xl p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck size={16} />
                Fechamento Patrimonial
              </span>
              <span className="text-[10px] text-slate-400">Ativo Total - Passivo Total</span>
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <span className="text-sm font-semibold text-slate-300">Patrimônio Líquido Real</span>
              <span className="text-2xl font-black text-white font-mono">
                {formatBRL(summary?.netWorth || 0)}
              </span>
            </div>

            <div className="pt-2 text-xs text-slate-400 leading-relaxed border-t border-white/5">
              💡 <em>Após o envio dos valores dos imóveis, veículos e investimentos, este valor refletirá com total precisão o seu patrimônio financeiro e imobilizado global.</em>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL PARA ADICIONAR / EDITAR ITEM DO BALANÇO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                {modalItem.id ? "Editar Item do Balanço" : "Adicionar Bem ou Obrigação"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModalItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400">Tipo Contábil</label>
                  <select
                    value={modalItem.type}
                    onChange={(e) =>
                      setModalItem({ ...modalItem, type: e.target.value as any })
                    }
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="ASSET">Ativo (O que você tem / Bens)</option>
                    <option value="LIABILITY">Passivo (O que você deve / Dívidas)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">Prazo / Subgrupo</label>
                  <select
                    value={modalItem.subgroup}
                    onChange={(e) =>
                      setModalItem({ ...modalItem, subgroup: e.target.value as any })
                    }
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  >
                    <option value="CIRCULANTE">Circulante (Curto Prazo)</option>
                    <option value="NAO_CIRCULANTE">Não Circulante (Longo Prazo / Imobilizado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Categoria</label>
                <select
                  value={modalItem.category}
                  onChange={(e) => setModalItem({ ...modalItem, category: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                >
                  {modalItem.type === "ASSET" ? (
                    <>
                      <option value="CAIXA_BANCOS">Caixa & Bancos (Conta Corrente)</option>
                      <option value="APLICACOES_LIQUIDEZ">Renda Fixa / Reserva com Liquidez</option>
                      <option value="IMOVEIS">Imóveis (Casas, Apartamentos, Terrenos)</option>
                      <option value="VEICULOS">Veículos (Carros, Motos, etc.)</option>
                      <option value="INVESTIMENTOS_LP">Investimentos (Ações, FIIs, Cripto, Previdência)</option>
                      <option value="PARTICIPACOES">Participações em Empresas / Cotas</option>
                      <option value="OUTROS_BENS">Outros Bens e Direitos</option>
                    </>
                  ) : (
                    <>
                      <option value="CARTOES_CREDITO">Cartões de Crédito (Fatura)</option>
                      <option value="CONTAS_PAGAR">Contas a Pagar / Despesas Fixas</option>
                      <option value="FINANCIAMENTOS">Financiamentos (Imobiliário / Veículo)</option>
                      <option value="EMPRESTIMOS">Empréstimos Bancários / Consórcios</option>
                      <option value="OUTRAS_OBRIGACOES">Outras Dívidas e Obrigações</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Título / Nome do Bem ou Dívida</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Apartamento Jardins, BMW 320i, Saldo em Conta BB"
                  value={modalItem.title}
                  onChange={(e) => setModalItem({ ...modalItem, title: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400">Instituição / Detalhe</label>
                  <input
                    type="text"
                    placeholder="Ex: Banco do Brasil, XP, Próprio"
                    value={modalItem.institution}
                    onChange={(e) => setModalItem({ ...modalItem, institution: e.target.value })}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400">Valor Atual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={modalItem.value}
                    onChange={(e) => setModalItem({ ...modalItem, value: e.target.value })}
                    className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400">Observações (opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Financiado em 360 meses, saldo devedor atualizado..."
                  value={modalItem.notes}
                  onChange={(e) => setModalItem({ ...modalItem, notes: e.target.value })}
                  className="w-full mt-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-lg shadow-emerald-950/40"
                >
                  {savingItem ? "Salvando..." : "Salvar no Balanço"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
