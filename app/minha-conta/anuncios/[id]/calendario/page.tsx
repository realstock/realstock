"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Moon,
  RotateCcw,
  Sparkles,
  Ban,
  Share2,
  Copy,
  Check
} from "lucide-react";

type Block = {
  start: string;
  end: string;
  label: string;
  source: "local" | "ical";
  guests?: number | null;
};

type CustomRateEntry = {
  price?: number;
  minNights?: number;
  blocked?: boolean;
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isoToDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function CalendarioPropertyPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const propertyId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [copiedIcal, setCopiedIcal] = useState(false);

  const [propertyTitle, setPropertyTitle] = useState("");
  const [basePrice, setBasePrice] = useState<number>(0);
  const [minNights, setMinNights] = useState<number>(1);
  const [customRates, setCustomRates] = useState<Record<string, CustomRateEntry>>({});
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Month navigation
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Date range selection state
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const [selectionDailyRate, setSelectionDailyRate] = useState<string>("");
  const [selectionMinNights, setSelectionMinNights] = useState<string>("");
  const [selectionIsOpen, setSelectionIsOpen] = useState<boolean>(true); // On/Off toggle state for selection

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/calendario`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar dados do calendário.");
      }
      setPropertyTitle(data.propertyTitle || "Imóvel");
      const basePr = Number(data.basePrice || 0);
      const minNi = Number(data.minNights || 1);
      setBasePrice(basePr);
      setMinNights(minNi);

      // Normalize customRates (convert numeric entries to object format)
      const rawRates = data.customRates || {};
      const normalizedRates: Record<string, CustomRateEntry> = {};
      for (const [k, v] of Object.entries(rawRates)) {
        if (typeof v === "number") {
          normalizedRates[k] = { price: v };
        } else if (v && typeof v === "object") {
          normalizedRates[k] = v as CustomRateEntry;
        }
      }
      setCustomRates(normalizedRates);
      setBlocks(data.blocks || []);
    } catch (err: any) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && propertyId) {
      loadCalendarData();
    }
  }, [status, propertyId, loadCalendarData, router]);

  // Persist changes directly to database automatically
  async function persistChanges(
    newBasePrice = basePrice,
    newMinNights = minNights,
    newCustomRates = customRates
  ) {
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/calendario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basePrice: newBasePrice,
          minNights: newMinNights,
          customRates: newCustomRates,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar alterações no calendário.");
      }

      setSuccessMsg("Alterações salvas automaticamente!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: any) {
      setError(err.message || "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // Blocked day lookup map
  const blockedDayMap = useMemo(() => {
    const map = new Map<string, Block>();
    for (const block of blocks) {
      if (!block.start || !block.end) continue;
      const days = eachDayOfInterval(isoToDate(block.start), isoToDate(block.end));
      for (const day of days) {
        map.set(dateToIso(day), block);
      }
    }
    return map;
  }, [blocks]);

  // Handle day click for range selection
  function handleDayClick(iso: string) {
    if (blockedDayMap.has(iso)) return; // iCal / local reservation blocks can't be selected

    if (!rangeStart || (rangeStart && rangeEnd)) {
      // Start a new selection
      setRangeStart(iso);
      setRangeEnd(null);
      const entry = customRates[iso];
      const curPrice = entry?.price !== undefined ? entry.price : basePrice;
      const curMinNights = entry?.minNights !== undefined ? entry.minNights : minNights;
      const curIsOpen = entry?.blocked !== true;
      setSelectionDailyRate(String(curPrice));
      setSelectionMinNights(String(curMinNights));
      setSelectionIsOpen(curIsOpen);
    } else {
      // Completing a selection range
      if (iso < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(iso);
      } else {
        setRangeEnd(iso);
      }
    }
  }

  // Calculate selected date array
  const selectedDatesArray = useMemo(() => {
    if (!rangeStart) return [];
    const startIso = rangeStart;
    const endIso = rangeEnd || (hoverDate && hoverDate >= rangeStart ? hoverDate : rangeStart);
    if (startIso > endIso) {
      return eachDayOfInterval(isoToDate(endIso), isoToDate(startIso)).map(dateToIso);
    }
    return eachDayOfInterval(isoToDate(startIso), isoToDate(endIso)).map(dateToIso);
  }, [rangeStart, rangeEnd, hoverDate]);

  // Apply custom rate, custom minNights & On/Off status to selected range and auto-save
  function applyRateToSelection() {
    if (!rangeStart) return;

    const priceNum = selectionDailyRate ? Number(selectionDailyRate) : undefined;
    const minNightsNum = selectionMinNights ? Number(selectionMinNights) : undefined;

    if (priceNum !== undefined && (isNaN(priceNum) || priceNum < 0)) {
      alert("Insira um valor de diária válido.");
      return;
    }
    if (minNightsNum !== undefined && (isNaN(minNightsNum) || minNightsNum <= 0)) {
      alert("Insira um número de noites mínimas válido.");
      return;
    }

    const updated = { ...customRates };
    for (const d of selectedDatesArray) {
      const entry: CustomRateEntry = {};
      if (priceNum !== undefined && priceNum !== basePrice) {
        entry.price = priceNum;
      }
      if (minNightsNum !== undefined && minNightsNum !== minNights) {
        entry.minNights = minNightsNum;
      }
      entry.blocked = !selectionIsOpen; // false = Open (Aberto), true = Closed (Fechado)

      if (entry.price === undefined && entry.minNights === undefined && !entry.blocked) {
        delete updated[d]; // Reset to default
      } else {
        updated[d] = entry;
      }
    }

    setCustomRates(updated);
    setRangeStart(null);
    setRangeEnd(null);
    setHoverDate(null);
    setSelectionDailyRate("");
    setSelectionMinNights("");

    // Auto save to database
    persistChanges(basePrice, minNights, updated);
  }

  // Reset selected range to default base values and auto-save
  function resetSelectionToBasePrice() {
    if (!rangeStart) return;
    const updated = { ...customRates };
    for (const d of selectedDatesArray) {
      delete updated[d];
    }
    setCustomRates(updated);
    setRangeStart(null);
    setRangeEnd(null);
    setHoverDate(null);
    setSelectionDailyRate("");
    setSelectionMinNights("");

    // Auto save to database
    persistChanges(basePrice, minNights, updated);
  }

  // Month grid calculations
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstDay.getDay();
  const totalCells = startPad + lastDay.getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(viewYear, viewMonth, d));

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  if (loading) {
    return <LoadingScreen title="Calendário" subtitle="Carregando disponibilidade e diárias..." />;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Navigation back */}
        <div className="mb-6">
          <Link
            href="/minha-conta/anuncios"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} />
            Voltar para Meus Anúncios
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400">
              <CalendarIcon size={16} />
              Gestão de Aluguel por Temporada
            </div>
            <h1 className="mt-1 text-3xl font-black text-white">{propertyTitle}</h1>
            <p className="text-sm text-slate-400 mt-1">
              Altere o preço e mínimo de noites padrão para todos os dias ou selecione um período no calendário para abrir/fechar para reservas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {saving ? (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-400">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                Salvando alterações...
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs font-bold text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Salvo automaticamente
              </div>
            )}
          </div>
        </div>

        {/* Success / Error Banners */}
        {successMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 animate-in fade-in duration-200">
            <CheckCircle2 size={20} />
            <span className="text-sm font-bold">{successMsg}</span>
          </div>
        )}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300">
            <AlertCircle size={20} />
            <span className="text-sm font-bold">{error}</span>
          </div>
        )}

        {/* Default Base Settings: Base Price & Default Min Nights */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Base Daily Price Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <DollarSign size={16} />
              Diária Padrão (Todos os dias) *
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm font-black text-slate-400">R$</span>
              <input
                type="number"
                min={0}
                step={10}
                value={basePrice}
                onChange={(e) => {
                  const val = Math.max(0, Number(e.target.value));
                  setBasePrice(val);
                }}
                onBlur={() => persistChanges(basePrice, minNights, customRates)}
                className="w-full rounded-xl border border-emerald-500/30 bg-slate-900 px-3 py-2 text-xl font-black text-emerald-400 focus:border-emerald-400 focus:outline-none"
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Valor padrão da diária para qualquer dia sem preço customizado.
            </p>
          </div>

          {/* Default Minimum Nights Card */}
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
              <Moon size={16} />
              Noites Mínimas Padrão *
            </div>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={30}
                value={minNights}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setMinNights(val);
                }}
                onBlur={() => persistChanges(basePrice, minNights, customRates)}
                className="w-24 rounded-xl border border-sky-500/30 bg-slate-900 px-3 py-2 text-xl font-black text-sky-400 focus:border-sky-400 focus:outline-none text-center"
              />
              <span className="text-sm font-bold text-slate-300">
                {minNights === 1 ? "noite mínima" : "noites mínimas"}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Quantidade mínima padrão de noites exigida em reservas normais.
            </p>
          </div>

          {/* Quick instructions card */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 backdrop-blur-md sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
              <Sparkles size={16} />
              Preços & Bloqueios por Período
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Clique no dia inicial e final para selecionar. No painel flutuante, use a chave <strong>On/Off</strong> para abrir ou fechar para reservas!
            </p>
          </div>
        </div>

        {/* Selected Period Controls Box */}
        {rangeStart && (
          <div className="mb-8 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 p-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300">
                  Período Selecionado ({selectedDatesArray.length} {selectedDatesArray.length === 1 ? "dia" : "dias"})
                </span>
                <h3 className="mt-1 text-base font-bold text-white">
                  {selectedDatesArray.length === 1
                    ? `Data: ${isoToDate(rangeStart).toLocaleDateString("pt-BR")}`
                    : `De ${isoToDate(selectedDatesArray[0]).toLocaleDateString("pt-BR")} até ${isoToDate(selectedDatesArray[selectedDatesArray.length - 1]).toLocaleDateString("pt-BR")}`}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* ON / OFF Toggle Switch for Open / Closed status */}
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3.5 py-1.5">
                  <span className="text-xs font-bold text-slate-300">Status:</span>
                  <button
                    type="button"
                    onClick={() => setSelectionIsOpen((prev) => !prev)}
                    className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      selectionIsOpen ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                        selectionIsOpen ? "translate-x-7" : "translate-x-0"
                      }`}
                    >
                      {selectionIsOpen ? (
                        <CheckCircle2 size={14} className="text-emerald-600 font-bold" />
                      ) : (
                        <Ban size={14} className="text-amber-600 font-bold" />
                      )}
                    </span>
                  </button>
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      selectionIsOpen ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {selectionIsOpen ? "Aberto para Reservas" : "Fechado para Reservas"}
                  </span>
                </div>

                {selectionIsOpen && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Diária (R$):</span>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        placeholder={`Ex: ${basePrice}`}
                        value={selectionDailyRate}
                        onChange={(e) => setSelectionDailyRate(e.target.value)}
                        className="w-28 rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm font-black text-emerald-400 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Mín. Noites:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        placeholder={`Ex: ${minNights}`}
                        value={selectionMinNights}
                        onChange={(e) => setSelectionMinNights(e.target.value)}
                        className="w-20 rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm font-black text-sky-400 focus:border-sky-500 focus:outline-none text-center"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={applyRateToSelection}
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 transition-all hover:bg-emerald-400 active:scale-95 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Aplicar à Seleção
                </button>

                <button
                  onClick={resetSelectionToBasePrice}
                  className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  Restaurar Padrão
                </button>

                <button
                  onClick={() => {
                    setRangeStart(null);
                    setRangeEnd(null);
                    setHoverDate(null);
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Calendar View */}
        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
          {/* Calendar Header Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xl font-black text-white uppercase tracking-widest">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button
                onClick={() => {
                  setViewMonth(today.getMonth());
                  setViewYear(today.getFullYear());
                }}
                className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                Hoje
              </button>
            </div>

            <button
              onClick={nextMonth}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2 text-center">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-1 text-xs font-black text-slate-500 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 bg-slate-950/60 p-2 rounded-2xl border border-white/5">
            {cells.map((date, i) => {
              if (!date) {
                return <div key={`empty-${i}`} className="aspect-[4/3] rounded-xl bg-slate-900/40" />;
              }

              const iso = dateToIso(date);
              const isToday = iso === dateToIso(today);
              const isPast = date < today && !isToday;
              const isSelected = selectedDatesArray.includes(iso);
              const isStart = rangeStart === iso;

              const checkInBlock = blocks.find((b) => b.start === iso);
              const checkOutBlock = blocks.find((b) => b.end === iso);
              const fullStayBlock = blocks.find((b) => b.start < iso && iso < b.end);

              const entry = customRates[iso];
              const isOwnerBlocked = entry?.blocked === true;
              const displayRate = entry?.price !== undefined ? entry.price : basePrice;
              const displayMinNights = entry?.minNights !== undefined ? entry.minNights : minNights;
              const isCustomPrice = entry?.price !== undefined;
              const isCustomMinNights = entry?.minNights !== undefined;

              // Card styling logic
              let cellBg = "bg-slate-900 border-white/5 hover:border-white/20";
              let customStyle: React.CSSProperties = {};

              if (fullStayBlock) {
                const bgClr = fullStayBlock.source === "local" ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)";
                customStyle = { backgroundColor: bgClr };
                cellBg = "border-emerald-500/40 cursor-not-allowed";
              } else if (checkInBlock && checkOutBlock) {
                const cLeft = checkOutBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                const cRight = checkInBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                customStyle = { background: `linear-gradient(135deg, ${cLeft} 50%, ${cRight} 50%)` };
                cellBg = "border-emerald-500/40";
              } else if (checkInBlock) {
                const cRight = checkInBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                customStyle = { background: `linear-gradient(135deg, transparent 50%, ${cRight} 50%)` };
                cellBg = "border-emerald-500/30";
              } else if (checkOutBlock) {
                const cLeft = checkOutBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                customStyle = { background: `linear-gradient(135deg, ${cLeft} 50%, transparent 50%)` };
                cellBg = "border-emerald-500/30";
              } else if (isOwnerBlocked) {
                cellBg = "bg-amber-500/20 border-amber-500/50 hover:border-amber-400";
              } else if (isSelected) {
                cellBg = "bg-emerald-500/30 border-emerald-500 ring-2 ring-emerald-400/50";
              } else if (isPast) {
                cellBg = "bg-slate-900/40 border-transparent opacity-60";
              }

              const anyBlock = fullStayBlock || checkInBlock || checkOutBlock;

              return (
                <div
                  key={iso}
                  onClick={() => handleDayClick(iso)}
                  onMouseEnter={() => {
                    if (rangeStart && !rangeEnd) setHoverDate(iso);
                  }}
                  style={customStyle}
                  title={
                    fullStayBlock
                      ? fullStayBlock.label
                      : checkInBlock || checkOutBlock
                      ? `Check-in / Check-out: ${checkInBlock?.label || checkOutBlock?.label}`
                      : isOwnerBlocked
                      ? `Data: ${date.toLocaleDateString("pt-BR")} | Fechado pelo proprietário`
                      : `Data: ${date.toLocaleDateString("pt-BR")} | R$ ${displayRate} | Mín: ${displayMinNights} noites`
                  }
                  className={`group relative aspect-[4/3] flex flex-col justify-between rounded-xl border p-2 transition-all cursor-pointer select-none ${cellBg}`}
                >
                  {/* Top Bar: Date number + Status Badges */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black ${
                        isToday
                          ? "flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold"
                          : isSelected
                          ? "text-emerald-300"
                          : anyBlock || isOwnerBlocked
                          ? "text-amber-300"
                          : "text-slate-200"
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {anyBlock?.source === "local" && (
                      <span className="rounded bg-emerald-500/30 px-1 py-0.5 text-[9px] font-black uppercase text-emerald-400">
                        Reserva
                      </span>
                    )}
                    {anyBlock?.source === "ical" && (
                      <span className="rounded bg-rose-500/30 px-1 py-0.5 text-[9px] font-black uppercase text-rose-300">
                        iCal
                      </span>
                    )}
                    {!anyBlock && isOwnerBlocked && (
                      <span className="rounded bg-amber-500/30 border border-amber-500/40 px-1 py-0.5 text-[9px] font-black uppercase text-amber-300">
                        Fechado
                      </span>
                    )}
                    {!anyBlock && !isOwnerBlocked && isCustomMinNights && (
                      <span className="rounded bg-sky-500/20 border border-sky-500/30 px-1 py-0.5 text-[8px] font-black text-sky-300">
                        {displayMinNights}n
                      </span>
                    )}
                  </div>

                  {/* Bottom Bar: Daily Price Display */}
                  {!anyBlock && !isOwnerBlocked && (
                    <div className="mt-1 text-right">
                      <span
                        className={`text-[11px] font-extrabold ${
                          isCustomPrice
                            ? "text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30"
                            : "text-emerald-400/90"
                        }`}
                      >
                        R$ {displayRate}
                      </span>
                    </div>
                  )}

                  {/* Start Range Indicator */}
                  {isStart && (
                    <div className="absolute top-0 left-0 h-1.5 w-full rounded-t-xl bg-emerald-400" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4 text-xs font-medium text-slate-400">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-md bg-emerald-500/30 border border-emerald-500/50" />
                <span>Reserva efetuada no site</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-md bg-rose-500/30 border border-rose-500/50" />
                <span>Bloqueado via iCal (Airbnb/Booking)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-md bg-amber-500/30 border border-amber-500/50" />
                <span className="text-amber-300 font-bold">Fechado pelo Proprietário</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-md bg-amber-400/10 border border-amber-400/30" />
                <span className="text-amber-400">Diária Customizada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full bg-emerald-500" />
                <span>Hoje</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Períodos com regras customizadas: {Object.keys(customRates).length} {Object.keys(customRates).length === 1 ? "dia" : "dias"}
            </div>
          </div>
        </div>

        {/* SECTION: EXPORTAR LINK ICAL PARA OUTROS SITES */}
        <div className="mt-8 rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900/80 to-indigo-950/40 p-6 backdrop-blur-xl space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Link de Exportação iCal para Outros Sites</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Compartilhe a disponibilidade do seu calendário RealStock com Airbnb, Booking.com, Vrbo e outros portais.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const url = `https://www.realstock.com.br/api/ical/${propertyId}.ics`;
                navigator.clipboard.writeText(url);
                setCopiedIcal(true);
                setTimeout(() => setCopiedIcal(false), 3000);
              }}
              className="w-full sm:w-auto rounded-xl bg-sky-500 hover:bg-sky-400 px-5 py-3 text-xs font-black text-slate-950 shadow-lg shadow-sky-500/20 transition cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              {copiedIcal ? <Check size={16} className="text-slate-950" /> : <Copy size={16} />}
              <span>{copiedIcal ? "Link Copiado!" : "Copiar Link iCal"}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <input
              type="text"
              readOnly
              value={`https://www.realstock.com.br/api/ical/${propertyId}.ics`}
              className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-sky-300 font-mono select-all focus:outline-none"
            />
            <a
              href={`https://www.realstock.com.br/api/ical/${propertyId}.ics`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-bold text-slate-300 transition text-center shrink-0"
            >
              Testar / Baixar .ics ↗
            </a>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4 text-[11px] text-slate-400 leading-relaxed space-y-1">
            <strong className="text-slate-200 block font-semibold mb-1">Como importar este link no Airbnb, Booking ou Vrbo:</strong>
            <p>1. Copie o link acima clicando no botão <strong>"Copiar Link iCal"</strong>.</p>
            <p>2. Acesse o painel do anfitrião no site externo (ex: Airbnb -&gt; Calendário -&gt; Configurações de Disponibilidade -&gt; Importar Calendário).</p>
            <p>3. Cole este link no campo correspondente. O portal externo sincronizará as reservas e bloqueios do RealStock automaticamente.</p>
          </div>
        </div>

        {/* Section: Blocked Periods List */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <Clock size={16} />
            Bloqueios e Reservas em {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>

          {blocks.filter((b) => {
            if (!b.start || !b.end) return false;
            const s = isoToDate(b.start);
            const e = isoToDate(b.end);
            const mStart = new Date(viewYear, viewMonth, 1);
            const mEnd = new Date(viewYear, viewMonth + 1, 0);
            return s <= mEnd && e >= mStart;
          }).length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum bloqueio ou reserva cadastrada para este mês.</p>
          ) : (
            <div className="space-y-3">
              {blocks
                .filter((b) => {
                  if (!b.start || !b.end) return false;
                  const s = isoToDate(b.start);
                  const e = isoToDate(b.end);
                  const mStart = new Date(viewYear, viewMonth, 1);
                  const mEnd = new Date(viewYear, viewMonth + 1, 0);
                  return s <= mEnd && e >= mStart;
                })
                .map((b, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl p-3.5 border text-sm ${
                      b.source === "local"
                        ? "border-emerald-500/20 bg-emerald-500/10"
                        : "border-rose-500/20 bg-rose-500/10"
                    }`}
                  >
                    <div>
                      <p className={`font-bold text-sm ${b.source === "local" ? "text-emerald-300" : "text-rose-300"}`}>
                        {b.label}
                        {b.guests ? <span className="ml-2 font-normal text-slate-400">· {b.guests} hóspede{b.guests !== 1 ? "s" : ""}</span> : null}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isoToDate(b.start).toLocaleDateString("pt-BR")} → {isoToDate(b.end).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                        b.source === "local"
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                      }`}
                    >
                      {b.source === "local" ? "Reserva do Site" : "Feed iCal"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
