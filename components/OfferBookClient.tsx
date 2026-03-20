"use client";

import { useEffect, useMemo, useState } from "react";

type OfferItem = {
  id: number;
  buyer_name: string;
  offer_price: string;
  status: string;
  created_at: string;
};

function getInitials(name?: string) {
  if (!name) return "Comprador";

  const parts = name.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0].toUpperCase() + ".";
  }

  return parts.map((p) => p[0].toUpperCase() + ".").join(" ");
}

function MarketCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "blue" | "yellow";
}) {
  const toneMap = {
    emerald: "text-emerald-400",
    blue: "text-blue-300",
    yellow: "text-yellow-300",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className={`mt-2 text-base font-bold ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}

export default function OfferBookClient({
  propertyId,
  ownerId,
  askingPrice,
  offers,
}: {
  propertyId: number;
  ownerId: number;
  askingPrice: string;
  offers: OfferItem[];
}) {
  const [offerPrice, setOfferPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const raw = localStorage.getItem("realstock_user");
    setCurrentUser(raw ? JSON.parse(raw) : null);
  }, []);

  const isOwner = currentUser?.id === ownerId;
  const asking = Number(askingPrice);

  const sortedOffers = useMemo(
    () =>
      [...offers].sort((a, b) => Number(b.offer_price) - Number(a.offer_price)),
    [offers]
  );

  const activeOffers = sortedOffers.filter((offer) =>
    ["open", "matched", "accepted"].includes(offer.status)
  );

  const bestOffer =
    activeOffers.length > 0 ? Number(activeOffers[0].offer_price) : 0;
  const maxOffer =
    activeOffers.length > 0 ? Number(activeOffers[0].offer_price) : 1;
  const spread = bestOffer > 0 ? asking - bestOffer : asking;

  async function handleOffer() {
    setMessage("");
    setError("");

    if (!currentUser?.id) {
      setError("Faça login para enviar uma proposta.");
      return;
    }

    if (isOwner) {
      setError("Você não pode enviar proposta para o seu próprio anúncio.");
      return;
    }

    const res = await fetch("/api/offers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        property_id: propertyId,
        buyer_id: currentUser.id,
        offer_price: offerPrice,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error || "Erro ao registrar proposta.");
      return;
    }

    setMessage("Proposta enviada com sucesso.");
    window.location.reload();
  }

  function statusColor(status: string) {
    if (status === "accepted") return "text-emerald-400";
    if (status === "matched") return "text-yellow-300";
    if (status === "cancelled") return "text-slate-500";
    if (status === "open") return "text-blue-300";
    return "text-slate-400";
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-slate-950/90 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-slate-500">
              RealStock Market Depth
            </div>
            <div className="mt-1 text-2xl font-bold text-white">
              Book de ofertas
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            {activeOffers.length} ofertas ativas
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MarketCard
            label="Preço pedido"
            value={`R$ ${asking.toLocaleString("pt-BR")}`}
            tone="emerald"
          />
          <MarketCard
            label="Melhor bid"
            value={bestOffer > 0 ? `R$ ${bestOffer.toLocaleString("pt-BR")}` : "-"}
            tone="blue"
          />
          <MarketCard
            label="Spread"
            value={`R$ ${spread.toLocaleString("pt-BR")}`}
            tone="yellow"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/90">
        <div className="border-b border-white/10 bg-white/[0.04] px-5 py-4">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr] items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            <div>Comprador</div>
            <div>Bid</div>
            <div>Spread</div>
            <div>Status</div>
          </div>
        </div>

        <div className="border-b border-emerald-400/20 bg-emerald-400/10 px-5 py-4">
          <div className="grid grid-cols-[1.3fr_1fr_1fr_0.8fr] items-center gap-3">
            <div className="text-sm font-semibold text-white">
              Preço pedido do vendedor
            </div>
            <div className="text-lg font-bold text-emerald-400">
              R$ {asking.toLocaleString("pt-BR")}
            </div>
            <div className="text-sm text-slate-300">Referência do anúncio</div>
            <div className="text-xs font-bold uppercase tracking-wide text-emerald-300">
              Ask
            </div>
          </div>
        </div>

        {sortedOffers.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            Ainda não há ofertas para este imóvel.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {sortedOffers.map((offer, index) => {
              const bid = Number(offer.offer_price);
              const rowSpread = asking - bid;
              const depth = maxOffer > 0 ? (bid / maxOffer) * 100 : 0;
              const isTopBid =
                index === 0 && ["open", "matched", "accepted"].includes(offer.status);

              return (
                <div
                  key={offer.id}
                  className="relative px-5 py-4 transition hover:bg-white/[0.02]"
                >
                  <div
                    className={`absolute inset-y-1 left-0 rounded-r-2xl ${
                      isTopBid ? "bg-emerald-500/12" : "bg-blue-500/8"
                    }`}
                    style={{ width: `${Math.max(depth, 8)}%` }}
                  />

                  <div className="relative z-10 grid grid-cols-[1.3fr_1fr_1fr_0.8fr] items-center gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">
                        {getInitials(offer.buyer_name)}
                      </div>
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                        {isTopBid ? "Melhor oferta" : "Oferta"}
                      </div>
                    </div>

                    <div className="text-sm font-bold text-emerald-300">
                      R$ {bid.toLocaleString("pt-BR")}
                    </div>

                    <div className="text-sm text-yellow-200">
                      R$ {rowSpread.toLocaleString("pt-BR")}
                    </div>

                    <div
                      className={`text-xs font-bold uppercase tracking-[0.14em] ${statusColor(
                        offer.status
                      )}`}
                    >
                      {offer.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-slate-950/90 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="text-lg font-bold text-white">Enviar nova ordem</div>

          {mounted && !isOwner && (
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Buy Order
            </div>
          )}
        </div>

        {!mounted ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400">
            Carregando...
          </div>
        ) : isOwner ? (
          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-200">
            Este anúncio é seu. Você não pode enviar proposta para o próprio imóvel.
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Valor da oferta
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="Digite o valor da proposta"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition focus:border-emerald-400/40"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleOffer}
                  className="rounded-2xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:opacity-90"
                >
                  Enviar
                </button>
              </div>
            </div>

            {message && (
              <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                {message}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}