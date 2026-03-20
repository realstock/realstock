"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminBackButton from "@/components/AdminBackButton";
type Payment = {
  id: number;
  offerId: number;
  sellerId: number;
  paymentAmount: number | string;
  paymentStatus: string;
  paypalOrderId?: string | null;
  createdAt: string;
  seller?: {
    id: number;
    name?: string;
    email?: string;
  };
  offer?: {
    id: number;
    offerPrice: number | string;
    status: string;
    buyer?: {
      id: number;
      name?: string;
      email?: string;
    };
    property?: {
      id: number;
      title?: string;
      city?: string;
      state?: string;
      neighborhood?: string;
    };
  };
};

export default function AdminPagamentosPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function loadPayments() {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/pagamentos");
      const data = await res.json();

      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar pagamentos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  function getStatusLabel(status: string) {
    const s = String(status).toLowerCase();

    if (s === "paid") return "Pago";
    if (s === "pending") return "Pendente";
    if (s === "cancelled") return "Cancelado";
    return status;
  }

  function getStatusBadge(status: string) {
    const s = String(status).toLowerCase();

    if (s === "paid") {
      return "bg-emerald-400/10 text-emerald-300 border-emerald-400/20";
    }

    if (s === "pending") {
      return "bg-yellow-400/10 text-yellow-300 border-yellow-400/20";
    }

    if (s === "cancelled") {
      return "bg-slate-400/10 text-slate-300 border-slate-400/20";
    }

    return "bg-white/10 text-white border-white/10";
  }

  const filtered = payments.filter((payment) => {
    const text = `
      ${payment.offer?.property?.title || ""}
      ${payment.offer?.property?.city || ""}
      ${payment.offer?.property?.neighborhood || ""}
      ${payment.offer?.buyer?.name || ""}
      ${payment.offer?.buyer?.email || ""}
      ${payment.seller?.name || ""}
      ${payment.seller?.email || ""}
      ${payment.paypalOrderId || ""}
    `
      .toLowerCase()
      .trim();

    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = statusFilter
      ? String(payment.paymentStatus).toLowerCase() === statusFilter.toLowerCase()
      : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6">
           <AdminBackButton />
          <h1 className="text-3xl font-bold">Gerenciar Pagamentos</h1>
          <p className="mt-1 text-slate-400">
            Acompanhe taxas PayPal, status e vínculos com ofertas.
          </p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por imóvel, comprador, vendedor, email ou PayPal Order ID"
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
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-[80px_1.4fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/10 px-4 py-3 text-sm text-slate-400">
            <div>ID</div>
            <div>Imóvel</div>
            <div>Comprador</div>
            <div>Vendedor</div>
            <div>Taxa</div>
            <div>Status</div>
            <div>Ações</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-slate-400">
              Carregando pagamentos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-slate-400">
              Nenhum pagamento encontrado.
            </div>
          ) : (
            filtered.map((payment) => (
              <div
                key={payment.id}
                className="grid grid-cols-[80px_1.4fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 px-4 py-4 text-sm items-center"
              >
                <div>#{payment.id}</div>

                <div>
                  <div className="font-medium">
                    {payment.offer?.property?.title || "-"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {[
                      payment.offer?.property?.neighborhood,
                      payment.offer?.property?.city,
                      payment.offer?.property?.state,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "-"}
                  </div>
                </div>

                <div>
                  <div>{payment.offer?.buyer?.name || "-"}</div>
                  <div className="text-xs text-slate-400">
                    {payment.offer?.buyer?.email || "-"}
                  </div>
                </div>

                <div>
                  <div>{payment.seller?.name || "-"}</div>
                  <div className="text-xs text-slate-400">
                    {payment.seller?.email || "-"}
                  </div>
                </div>

                <div className="font-semibold text-emerald-400">
                  R$ {Number(payment.paymentAmount).toLocaleString("pt-BR")}
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-xl border px-3 py-1 text-xs ${getStatusBadge(
                      payment.paymentStatus
                    )}`}
                  >
                    {getStatusLabel(payment.paymentStatus)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {payment.offer?.property?.id && (
                    <Link
                      href={`/imovel/${payment.offer.property.id}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs hover:bg-white/10"
                    >
                      Ver anúncio
                    </Link>
                  )}

                  <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-300">
                    {payment.paypalOrderId || "Sem order ID"}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}