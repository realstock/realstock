"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminBackButton from "@/components/AdminBackButton";
type Offer = {
  id: number;
  offerPrice: number;
  status: string;
  createdAt: string;
  buyer?: {
    id: number;
    name: string;
    email: string;
  };
  property?: {
    id: number;
    title: string;
    city?: string;
    state?: string;
    neighborhood?: string;
  };
};

export default function AdminOfertasPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function loadOffers() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/ofertas");
      const data = await res.json();

      if (data.success) {
        setOffers(data.offers || []);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar ofertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOffers();
  }, []);

  async function cancelOffer(offerId: number) {
    const confirmed = confirm("Deseja cancelar esta oferta?");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/admin/ofertas/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offerId,
          status: "cancelled",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao cancelar oferta.");
      }

      loadOffers();
    } catch (err: any) {
      alert(err.message || "Erro ao cancelar oferta.");
    }
  }

  function getStatusLabel(status: string) {
    const s = String(status).toLowerCase();

    if (s === "open") return "Em aberto";
    if (s === "accepted") return "Aceita";
    if (s === "cancelled") return "Cancelada";
    if (s === "matched") return "Match";
    return status;
  }

  function getStatusBadge(status: string) {
    const s = String(status).toLowerCase();

    if (s === "open") {
      return "bg-blue-400/10 text-blue-300 border-blue-400/20";
    }

    if (s === "accepted") {
      return "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
    }

    if (s === "cancelled") {
      return "bg-slate-400/10 text-slate-300 border-slate-400/20";
    }

    if (s === "matched") {
      return "bg-yellow-400/10 text-yellow-300 border-yellow-400/20";
    }

    return "bg-white/10 text-white border-white/10";
  }

  const filtered = offers.filter((offer) => {
    const text = `
      ${offer.property?.title || ""}
      ${offer.property?.city || ""}
      ${offer.property?.neighborhood || ""}
      ${offer.buyer?.name || ""}
      ${offer.buyer?.email || ""}
    `
      .toLowerCase()
      .trim();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = statusFilter
      ? String(offer.status).toLowerCase() === statusFilter.toLowerCase()
      : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6">
          <AdminBackButton /> 
          <h1 className="text-3xl font-bold">Gerenciar Ofertas</h1>
          <p className="mt-1 text-slate-400">
            Acompanhe, filtre e modere as ofertas do sistema.
          </p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por imóvel, cidade, comprador ou email"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            />
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
            >
              <option value="">Todos os status</option>
              <option value="open">Em aberto</option>
              <option value="accepted">Aceita</option>
              <option value="cancelled">Cancelada</option>
              <option value="matched">Match</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-[80px_1.5fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/10 px-4 py-3 text-sm text-slate-400">
            <div>ID</div>
            <div>Imóvel</div>
            <div>Comprador</div>
            <div>Valor</div>
            <div>Status</div>
            <div>Data</div>
            <div>Ações</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-slate-400">
              Carregando ofertas...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-slate-400">
              Nenhuma oferta encontrada.
            </div>
          ) : (
            filtered.map((offer) => (
              <div
                key={offer.id}
                className="grid grid-cols-[80px_1.5fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 px-4 py-4 text-sm items-center"
              >
                <div>#{offer.id}</div>

                <div>
                  <div className="font-medium">{offer.property?.title || "-"}</div>
                  <div className="text-xs text-slate-400">
                    {[offer.property?.neighborhood, offer.property?.city, offer.property?.state]
                      .filter(Boolean)
                      .join(" • ") || "-"}
                  </div>
                </div>

                <div>
                  <div>{offer.buyer?.name || "-"}</div>
                  <div className="text-xs text-slate-400">
                    {offer.buyer?.email || "-"}
                  </div>
                </div>

                <div className="font-semibold text-emerald-400">
                  R$ {Number(offer.offerPrice).toLocaleString("pt-BR")}
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-xl border px-3 py-1 text-xs ${getStatusBadge(
                      offer.status
                    )}`}
                  >
                    {getStatusLabel(offer.status)}
                  </span>
                </div>

                <div className="text-slate-300">
                  {new Date(offer.createdAt).toLocaleDateString("pt-BR")}
                </div>

                <div className="flex flex-wrap gap-2">
                  {offer.property?.id && (
                    <Link
                      href={`/imovel/${offer.property.id}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                    >
                      Ver anúncio
                    </Link>
                  )}

                  {String(offer.status).toLowerCase() === "open" && (
                    <button
                      onClick={() => cancelOffer(offer.id)}
                      className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-300 hover:bg-red-400/15"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}