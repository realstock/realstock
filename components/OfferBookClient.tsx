"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type OfferItem = {
  id: number;
  buyer_name: string;
  offer_price: string;
  status: string;
  created_at: string;
};

type Props = {
  propertyId: number;
  ownerId: number;
  askingPrice: string;
  offers: OfferItem[];
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
}: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [offerPrice, setOfferPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const userId = Number((session?.user as any)?.id);

  const isOwner = useMemo(() => {
    if (!userId || Number.isNaN(userId)) return false;
    return userId === ownerId;
  }, [userId, ownerId]);

  async function handleSubmitOffer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (status === "loading") return;

    if (!session?.user) {
      setError("Faça login para enviar uma proposta.");
      router.push("/login");
      return;
    }

    if (isOwner) {
      setError("Você não pode enviar proposta para o próprio imóvel.");
      return;
    }

    const numericOffer = Number(offerPrice);

    if (!numericOffer || Number.isNaN(numericOffer) || numericOffer <= 0) {
      setError("Informe um valor de proposta válido.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/offers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          property_id: propertyId,
          offer_price: numericOffer,
        }),
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
        throw new Error(data.error || "Erro ao enviar oferta.");
      }

      setMessage("Proposta enviada com sucesso.");
      setOfferPrice("");

      setTimeout(() => {
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError(err.message || "Erro ao enviar proposta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/40 p-5">
      <div className="text-sm text-slate-400">Livro de ofertas</div>

      <div className="mt-2 text-sm text-slate-300">
        Valor pedido:{" "}
        <span className="font-semibold text-emerald-400">
          R$ {formatMoney(askingPrice)}
        </span>
      </div>

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
        <form onSubmit={handleSubmitOffer} className="mt-5 space-y-3">
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
            className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 disabled:opacity-60"
          >
            {loading ? "Enviando proposta..." : "Enviar proposta"}
          </button>
        </form>
      )}

      {isOwner && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Você é o anunciante deste imóvel. As propostas recebidas aparecem em{" "}
          <span className="font-semibold text-white">Meus anúncios</span>.
        </div>
      )}

      <div className="mt-6">
        <div className="mb-3 text-sm font-medium text-slate-300">
          Histórico de propostas
        </div>

        {offers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            Ainda não há propostas para este imóvel.
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
                      Comprador
                    </div>
                    <div className="font-medium text-white">
                      {getInitials(offer.buyer_name)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-emerald-400">
                      R$ {formatMoney(offer.offer_price)}
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
    </div>
  );
}