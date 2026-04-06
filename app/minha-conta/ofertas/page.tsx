"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type OfferItem = {
  id: number;
  offerPrice: string | number;
  status: string;
  createdAt: string;
  property?: {
    id: number;
    title?: string;
    city?: string | null;
    state?: string | null;
    neighborhood?: string | null;
    images?: { imageUrl: string }[];
  };
};

export default function MinhasOfertasPage() {
  const { status } = useSession();
  const router = useRouter();

  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOffers() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/minha-conta/ofertas");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar ofertas.");
      }

      setOffers(data.offers || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar ofertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }

    if (status === "authenticated") {
      loadOffers();
    }
  }, [status, router]);

  async function handleCancel(offerId: number) {
    const confirmed = window.confirm("Deseja cancelar essa oferta?");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "cancel",
          offer_id: offerId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao cancelar oferta.");
      }

      await loadOffers();
    } catch (err: any) {
      alert(err.message || "Erro ao cancelar oferta.");
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-6xl text-slate-400">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="text-sm text-slate-400">Minha conta</div>
          <h1 className="mt-2 text-4xl font-bold">Minhas ofertas</h1>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {offers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">
            Você ainda não fez ofertas.
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="h-24 w-32 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                      {offer.property?.images?.[0]?.imageUrl ? (
                        <img
                          src={offer.property.images[0].imageUrl}
                          alt={offer.property?.title || "Imóvel"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-500">
                          Sem foto
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-lg font-semibold">
                        {offer.property?.title || "Imóvel"}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        {[
                          offer.property?.neighborhood,
                          offer.property?.city,
                          offer.property?.state,
                        ]
                          .filter(Boolean)
                          .join(" • ") || "-"}
                      </div>

                      <div className="mt-3 text-sm text-slate-300">
                        Oferta:{" "}
                        <span className="font-semibold text-emerald-400">
                          R$ {Number(offer.offerPrice).toLocaleString("pt-BR")}
                        </span>
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        Status: {offer.status}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {offer.property?.id && (
                      <Link
                        href={`/imovel/${offer.property.id}`}
                        className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                      >
                        Ver anúncio
                      </Link>
                    )}

                    {String(offer.status).toLowerCase() === "open" && (
                      <button
                        onClick={() => handleCancel(offer.id)}
                        className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300 hover:bg-red-400/15"
                      >
                        Cancelar oferta
                      </button>
                    )}

                    {String(offer.status).toLowerCase() === "accepted" && (
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                        Oferta aceita aguardando contato do vendedor
                      </div>
                    )}

                    {String(offer.status).toLowerCase() === "cancelled" && (
                      <div className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-slate-400">
                        Oferta cancelada
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}