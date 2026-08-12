"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Block = {
  start: string;
  end: string;
  label: string;
  source: "local" | "ical";
  guests?: number | null;
};

type Props = {
  propertyId: number;
  propertyTitle: string;
  onClose: () => void;
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

export default function CalendarioReservasModal({ propertyId, propertyTitle, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/calendario`);
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Erro ao carregar calendário.");
        setBlocks(data.blocks || []);
      } catch (err: any) {
        setError(err.message || "Erro inesperado.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [propertyId]);

  // Build set of blocked days for fast lookup
  const blockedDayMap = useCallback((): Map<string, Block> => {
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

  const dayMap = blockedDayMap();

  // Calendar grid for current viewMonth/viewYear
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const totalCells = startPad + lastDay.getDate();
  const rows = Math.ceil(totalCells / 7);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(viewYear, viewMonth, d));

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Unique blocks in current month for legend/list
  const monthBlocks = blocks.filter(b => {
    if (!b.start || !b.end) return false;
    const s = isoToDate(b.start);
    const e = isoToDate(b.end);
    const mStart = new Date(viewYear, viewMonth, 1);
    const mEnd = new Date(viewYear, viewMonth + 1, 0);
    return s <= mEnd && e >= mStart;
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-900 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-tight">Calendário de Reservas</h2>
              <p className="text-[10px] text-slate-500 font-medium truncate max-w-xs">{propertyTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-emerald-400" />
              <p className="text-sm font-medium">Sincronizando calendários externos...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm font-medium">
              {error}
            </div>
          ) : (
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-black text-white uppercase tracking-widest">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
                <button onClick={nextMonth} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                {cells.map((date, i) => {
                  if (!date) return <div key={`empty-${i}`} className="bg-slate-900 aspect-square" />;

                  const iso = dateToIso(date);
                  const isToday = iso === dateToIso(today);
                  const isPast = date < today && !isToday;

                  const checkInBlock = blocks.find((b) => b.start === iso);
                  const checkOutBlock = blocks.find((b) => b.end === iso);
                  const fullStayBlock = blocks.find((b) => b.start < iso && iso < b.end);

                  let customStyle: React.CSSProperties = {};
                  let cellTitle = "";
                  let isOccupiedAny = false;

                  if (fullStayBlock) {
                    isOccupiedAny = true;
                    cellTitle = fullStayBlock.label;
                    const bgClr = fullStayBlock.source === "local" ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)";
                    customStyle = { backgroundColor: bgClr };
                  } else if (checkInBlock && checkOutBlock) {
                    isOccupiedAny = true;
                    cellTitle = `Check-out: ${checkOutBlock.label} | Check-in: ${checkInBlock.label}`;
                    const cLeft = checkOutBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                    const cRight = checkInBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                    customStyle = { background: `linear-gradient(135deg, ${cLeft} 50%, ${cRight} 50%)` };
                  } else if (checkInBlock) {
                    isOccupiedAny = true;
                    cellTitle = `Check-in (Tarde): ${checkInBlock.label}`;
                    const cRight = checkInBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                    customStyle = { background: `linear-gradient(135deg, transparent 50%, ${cRight} 50%)` };
                  } else if (checkOutBlock) {
                    isOccupiedAny = true;
                    cellTitle = `Check-out (Manhã): ${checkOutBlock.label}`;
                    const cLeft = checkOutBlock.source === "local" ? "rgba(16, 185, 129, 0.35)" : "rgba(244, 63, 94, 0.35)";
                    customStyle = { background: `linear-gradient(135deg, ${cLeft} 50%, transparent 50%)` };
                  }

                  let baseBgClass = "bg-slate-900 hover:bg-slate-800";
                  if (isPast && !isOccupiedAny) baseBgClass = "bg-slate-900/60";

                  return (
                    <div
                      key={iso}
                      title={cellTitle}
                      style={customStyle}
                      className={`relative aspect-square flex items-center justify-center transition-colors ${baseBgClass}`}
                    >
                      <span className={`text-xs font-bold ${
                        isToday
                          ? "text-white bg-emerald-500 rounded-full w-6 h-6 flex items-center justify-center"
                          : isOccupiedAny
                          ? "text-white drop-shadow-md"
                          : isPast
                          ? "text-slate-700"
                          : "text-slate-300"
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 mt-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-5 rounded bg-emerald-500/40" />
                  <span className="text-[10px] text-slate-400 font-medium">Reservado no site</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-5 rounded bg-rose-500/30" />
                  <span className="text-[10px] text-slate-400 font-medium">Bloqueado via iCal</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-5 rounded bg-emerald-500" />
                  <span className="text-[10px] text-slate-400 font-medium">Hoje</span>
                </div>
              </div>

              {/* Blocks list for the month */}
              {monthBlocks.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Períodos bloqueados neste mês</p>
                  {monthBlocks.map((b, i) => (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-xl px-4 py-2.5 border text-sm ${
                        b.source === "local"
                          ? "border-emerald-500/20 bg-emerald-500/10"
                          : "border-rose-500/20 bg-rose-500/10"
                      }`}
                    >
                      <div>
                        <p className={`font-bold text-xs ${b.source === "local" ? "text-emerald-300" : "text-rose-300"}`}>
                          {b.label}
                          {b.guests ? <span className="ml-2 font-normal text-slate-400">· {b.guests} hóspede{b.guests !== 1 ? "s" : ""}</span> : null}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {new Date(b.start + "T12:00:00").toLocaleDateString("pt-BR")} → {new Date(b.end + "T12:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                        b.source === "local"
                          ? "border-emerald-500/30 text-emerald-400"
                          : "border-rose-500/30 text-rose-400"
                      }`}>
                        {b.source === "local" ? "Site" : "iCal"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {monthBlocks.length === 0 && (
                <p className="mt-5 text-center text-xs text-slate-600">Nenhum bloqueio neste mês.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
