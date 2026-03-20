"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OfferItem = {
  id: number;
  offerPrice: number | string;
  status: string;
  createdAt?: string;
  property?: {
    id: number;
    title: string;
    city?: string;
    state?: string;
    neighborhood?: string;
    images?: { imageUrl?: string; url?: string }[];
  };
};

export default function MinhasOfertasPage() {
  const [user, setUser] = useState<any>(null);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const stored = localStorage.getItem("realstock_user");

        if (!stored) {
          setError("Usuário não autenticado.");
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(stored);

        if (!parsedUser?.id) {
          setError("Usuário inválido.");
          setLoading(false);
          return;
        }

        setUser(parsedUser);

        const res = await fetch(
          `/api/minha-conta/ofertas?buyer_id=${Number(parsedUser.id)}`
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao carregar ofertas.");
        }

        setOffers(data.offers || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Erro ao carregar ofertas.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function getStatusLabel(status: string) {
    const s = String(status).toLowerCase();

    if (s === "accepted") {
      return "Oferta aceita, aguardando contato do vendedor";
    }

    if (s === "open") {
      return "Oferta em aberto";
    }

    if (s === "cancelled") {
      return "Oferta cancelada";
    }

    return status;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <div className="text-sm text-slate-400">Minha conta</div>
          <h1 className="mt-2 text-4xl font-bold">Minhas ofertas</h1>
          <p className="mt-2 text-slate-400">
            Acompanhe as propostas que você enviou.
          </p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">
            Carregando ofertas...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && offers.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">
            Você ainda não fez ofertas.
          </div>
        )}

        {!loading && !error && offers.length > 0 && (
          <div className="grid gap-6">
            {offers.map((offer) => {
              const image =
                offer.property?.images?.[0]?.imageUrl ||
                offer.property?.images?.[0]?.url ||
                "/placeholder.jpg";

              const location = [
                offer.property?.neighborhood,
                offer.property?.city,
                offer.property?.state,
              ]
                .filter(Boolean)
                .join(" • ");

              return (
                <div
                  key={offer.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                >
                  <div className="grid gap-0 md:grid-cols-[240px_1fr]">
                    <div className="h-full min-h-[180px] overflow-hidden bg-slate-900">
                      <img
                        src={image}
                        alt={offer.property?.title || "Imóvel"}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold">
                            {offer.property?.title || "Imóvel"}
                          </h2>
                          <p className="mt-1 text-sm text-slate-400">
                            {location || "-"}
                          </p>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-slate-400">
                            Sua oferta
                          </div>
                          <div className="text-2xl font-bold text-emerald-400">
                            R$ {Number(offer.offerPrice).toLocaleString("pt-BR")}
                          </div>
                        </div>
                      </div>

                      {/* STATUS */}
                      <div className="mt-4">
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">
                          Status:{" "}
                          <span className="font-semibold">
                            {getStatusLabel(offer.status)}
                          </span>
                        </div>
                      </div>

                      {/* BOTÕES */}
                      <div className="mt-5 flex flex-wrap gap-3">
                        {offer.property?.id && (
                          <Link
                            href={`/imovel/${offer.property.id}`}
                            className="inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
                          >
                            Ver anúncio
                          </Link>
                        )}

                        {String(offer.status).toLowerCase() === "open" && (
                          <button
                            onClick={async () => {
                              if (
                                !confirm(
                                  "Deseja cancelar essa oferta?"
                                )
                              )
                                return;

                              try {
                                const res = await fetch(
                                  "/api/minha-conta/ofertas/cancel",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      offer_id: offer.id,
                                      buyer_id: user.id,
                                    }),
                                  }
                                );

                                const data = await res.json();

                                if (!res.ok || !data.success) {
                                  throw new Error(
                                    data.error ||
                                      "Erro ao cancelar oferta."
                                  );
                                }

                                alert("Oferta cancelada com sucesso.");
                                window.location.reload();
                              } catch (err: any) {
                                alert(
                                  err.message || "Erro ao cancelar."
                                );
                              }
                            }}
                            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300 hover:bg-red-400/15"
                          >
                            Cancelar oferta
                          </button>
                        )}

                        {String(offer.status).toLowerCase() === "accepted" && (
                          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                            Oferta aceita, aguardando contato do vendedor
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}