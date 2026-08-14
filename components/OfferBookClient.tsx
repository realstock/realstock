"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type OfferItem = {
  id: number;
  buyer_name: string;
  offer_price: string;
  status: string;
  created_at: string;
  startDate?: string | null;
  endDate?: string | null;
  guests?: number | null;
};

type Props = {
  propertyId: number;
  ownerId: number;
  askingPrice: string;
  offers: OfferItem[];
  listingType?: string | null;
  minNights?: number | null;
  customRates?: Record<string, number> | null;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: string;
};

function getInitials(name: string) {
  if (!name) return "-";

  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0].toUpperCase() + ".")
    .join(" ");
}

function formatMoney(value: string | number) {
  const num = Number(value || 0);
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatStatus(status: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "open") return "Aberta";
  if (normalized === "accepted") return "Aceita";
  if (normalized === "cancelled") return "Cancelada";
  if (normalized === "matched") return "Concluída";

  return status;
}

export default function OfferBookClient({
  propertyId,
  ownerId,
  askingPrice,
  offers,
  listingType = "COMPRA_VENDA",
  minNights = 1,
  customRates = {},
  defaultCheckIn = "",
  defaultCheckOut = "",
  defaultGuests = "1",
}: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [offerPrice, setOfferPrice] = useState("");
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [guestsCount, setGuestsCount] = useState(defaultGuests || "1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (defaultCheckIn) setCheckIn(defaultCheckIn);
    if (defaultCheckOut) setCheckOut(defaultCheckOut);
    if (defaultGuests) setGuestsCount(defaultGuests);
  }, [defaultCheckIn, defaultCheckOut, defaultGuests]);

  const userId = Number((session?.user as any)?.id);

  const isOwner = useMemo(() => {
    if (!userId || Number.isNaN(userId)) return false;
    return userId === ownerId;
  }, [userId, ownerId]);

  const isSeasonal = listingType === "ALUGUEL_TEMPORADA";

  const numberOfNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const [inY, inM, inD] = checkIn.split("T")[0].split("-").map(Number);
    const [outY, outM, outD] = checkOut.split("T")[0].split("-").map(Number);
    if (!inY || !inM || !inD || !outY || !outM || !outD) return 0;

    const start = new Date(Date.UTC(inY, inM - 1, inD));
    const end = new Date(Date.UTC(outY, outM - 1, outD));
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [checkIn, checkOut]);

  const calculatedTotal = useMemo(() => {
    if (!checkIn || !checkOut || numberOfNights <= 0) return 0;
    const ratesMap = (customRates || {}) as Record<string, any>;
    const base = Number(askingPrice || 0);

    const [inY, inM, inD] = checkIn.split("T")[0].split("-").map(Number);
    if (!inY || !inM || !inD) return 0;

    let total = 0;
    const cur = new Date(Date.UTC(inY, inM - 1, inD));

    for (let i = 0; i < numberOfNights; i++) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cur.getUTCDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      
      const entry = ratesMap[dateStr];
      let nightRate = base;
      if (typeof entry === "number") {
        nightRate = entry;
      } else if (entry && typeof entry === "object" && entry.price !== undefined && entry.price !== null) {
        nightRate = Number(entry.price);
      }
      total += nightRate;

      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return total;
  }, [checkIn, checkOut, numberOfNights, askingPrice, customRates]);

  const effectiveMinNights = useMemo(() => {
    if (!checkIn) return minNights || 1;
    const ratesMap = (customRates || {}) as Record<string, any>;
    const entry = ratesMap[checkIn];
    if (entry && typeof entry === "object" && entry.minNights !== undefined) {
      return Number(entry.minNights);
    }
    return minNights || 1;
  }, [checkIn, customRates, minNights]);

  const dateOverlapError = useMemo(() => {
    if (!checkIn || !checkOut || !isSeasonal) return null;
    const [inY, inM, inD] = checkIn.split("T")[0].split("-").map(Number);
    const [outY, outM, outD] = checkOut.split("T")[0].split("-").map(Number);
    if (!inY || !inM || !inD || !outY || !outM || !outD) return null;

    const start = new Date(Date.UTC(inY, inM - 1, inD));
    const end = new Date(Date.UTC(outY, outM - 1, outD));
    
    // Check owner blocked dates in customRates
    const ratesMap = (customRates || {}) as Record<string, any>;
    const cur = new Date(Date.UTC(inY, inM - 1, inD));
    while (cur < end) {
      const y = cur.getUTCFullYear();
      const m = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const d = String(cur.getUTCDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

      const entry = ratesMap[dateStr];
      if (entry && typeof entry === "object" && entry.blocked === true) {
        return `Período indisponível: Datas fechadas para reserva pelo proprietário.`;
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    const activeStatuses = ["accepted", "ACCEPTED_WAITING_PAYMENT", "RESERVA_CONFIRMADA", "PENDING_HOST_APPROVAL"];
    for (const offer of offers) {
      if (activeStatuses.includes(offer.status) && offer.startDate && offer.endDate) {
        const oStart = new Date(offer.startDate);
        const oEnd = new Date(offer.endDate);

        // Strict night overlap check: reqStart < existEnd && reqEnd > existStart
        if (start < oEnd && end > oStart) {
          return `Período indisponível no intervalo selecionado.`;
        }
      }
    }
    return null;
  }, [checkIn, checkOut, offers, isSeasonal, customRates]);

  async function handleSubmitOffer(e: React.FormEvent | any, isVisit = false) {
    if (e && e.preventDefault) e.preventDefault();
    setError("");
    setMessage("");

    if (status === "loading") return;

    if (!session?.user) {
      setError("Faça login para enviar uma solicitação.");
      router.push("/login");
      return;
    }

    if (isOwner) {
      setError("Você não pode enviar solicitação para o próprio imóvel.");
      return;
    }

    let payload: any = {
      property_id: propertyId,
    };

    if (isSeasonal) {
      if (isVisit) {
        payload.offer_price = 0;
      } else {
        if (!checkIn || !checkOut) {
          setError("Selecione o período da reserva.");
          return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(checkIn) < today) {
          setError("A data de check-in não pode ser no passado.");
          return;
        }

        if (new Date(checkOut) <= new Date(checkIn)) {
          setError("A data de check-out deve ser após a data de check-in.");
          return;
        }

        if (dateOverlapError) {
          setError(dateOverlapError);
          return;
        }

        const nightsLimit = effectiveMinNights;
        if (numberOfNights < nightsLimit) {
          setError(`A estadia mínima para este período é de ${nightsLimit} noites.`);
          return;
        }

        payload.offer_price = calculatedTotal;
        payload.start_date = checkIn;
        payload.end_date = checkOut;
        payload.guests = Number(guestsCount);
      }
    } else {
      const numericOffer = isVisit ? 0 : Number(offerPrice);
      if (!isVisit && (!numericOffer || Number.isNaN(numericOffer) || numericOffer <= 0)) {
        setError("Informe um valor de proposta válido.");
        return;
      }
      payload.offer_price = numericOffer;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = {
          success: false,
          error: raw || "Resposta inválida da API.",
        };
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao enviar solicitação.");
      }

      if (isSeasonal) {
        setMessage(isVisit ? "Visita agendada com sucesso." : "Solicitação de reserva enviada com sucesso!");
        if (!isVisit) {
          setCheckIn("");
          setCheckOut("");
          setGuestsCount("1");
        }
      } else {
        setMessage(isVisit ? "Visita agendada com sucesso." : "Proposta enviada com sucesso.");
        if (!isVisit) setOfferPrice("");
      }

      setTimeout(() => {
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar solicitação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/40 p-5">
      <div className="text-sm text-slate-400">
        {isSeasonal ? "Reservar" : "Livro de ofertas"}
      </div>

      {!isSeasonal && (
        <div className="mt-2 text-sm text-slate-300">
          Valor pedido:{" "}
          <span className="font-semibold text-emerald-400">
            R$ {formatMoney(askingPrice)}
          </span>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!isOwner && (
        <form onSubmit={handleSubmitOffer} className="mt-4 space-y-3">
          {isSeasonal ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Check-in *</label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-500 transition cursor-pointer [color-scheme:dark]"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Check-out *</label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-500 transition cursor-pointer [color-scheme:dark]"
                  min={checkIn || new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 ml-0.5">Hóspedes *</label>
                <input
                  type="number"
                  min="1"
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-500 transition"
                  placeholder="Ex.: 2"
                />
              </div>

              {numberOfNights > 0 && (
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 mt-4 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Diárias:</span>
                    <span className="font-bold text-slate-200">{numberOfNights} {numberOfNights === 1 ? 'noite' : 'noites'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estadia mínima:</span>
                    <span className="font-bold text-slate-200">{minNights} {minNights === 1 ? 'noite' : 'noites'}</span>
                  </div>
                  <div className="border-t border-white/5 my-1.5 pt-1.5 flex justify-between text-sm">
                    <span className="text-emerald-400 font-bold">Total Estimado:</span>
                    <span className="text-emerald-300 font-black">R$ {formatMoney(calculatedTotal)}</span>
                  </div>
                </div>
              )}

              {dateOverlapError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-400">
                  ⚠️ {dateOverlapError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || status === "loading" || numberOfNights < (minNights ?? 1) || !!dateOverlapError}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60 cursor-pointer transition-all"
              >
                {loading ? "Aguarde..." : "Reservar"}
              </button>
            </div>
          ) : (
            <>
              <label className="block text-sm text-slate-300">
                Envie sua proposta
              </label>

              <input
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                placeholder="Ex.: 850000"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              />

              <button
                type="submit"
                disabled={loading || status === "loading"}
                className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 disabled:opacity-60 cursor-pointer"
              >
                {loading ? "Aguarde..." : "Enviar proposta"}
              </button>
            </>
          )}

        </form>
      )}

      {isOwner && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Você é o anunciante deste imóvel. As solicitações recebidas aparecem em{" "}
          <span className="font-semibold text-white">Meus anúncios</span>.
        </div>
      )}

      {!isSeasonal && (
        <div className="mt-6">
          <div className="mb-3 text-sm font-medium text-slate-300">
            Histórico de solicitações
          </div>

          {offers.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
              Ainda não há solicitações para este imóvel.
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-slate-400">
                        Interessado
                      </div>
                      <div className="font-medium text-white">
                        {getInitials(offer.buyer_name)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-emerald-400">
                        {Number(offer.offer_price) === 0 ? (
                          "Agendar Visita"
                        ) : offer.startDate && offer.endDate ? (
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-emerald-300 font-bold">Reserva de Estadia</span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(offer.startDate).toLocaleDateString("pt-BR")} a {new Date(offer.endDate).toLocaleDateString("pt-BR")}
                              {offer.guests && ` • ${offer.guests} ${offer.guests === 1 ? 'hóspede' : 'hóspedes'}`}
                            </span>
                            <span>R$ {formatMoney(offer.offer_price)}</span>
                          </div>
                        ) : (
                          `R$ ${formatMoney(offer.offer_price)}`
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatStatus(offer.status)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {new Date(offer.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}