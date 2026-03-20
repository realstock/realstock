"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type DashboardData = {
  totalProperties: number;
  totalUsers: number;
  totalOffers: number;
  totalPayments: number;
  totalRevenue: number;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Erro ao carregar dashboard.");
      }

      setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="mt-1 text-slate-400">
            Visão geral e atalhos de gerenciamento do RealStock
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">
            Carregando dashboard...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Card title="Imóveis" value={data?.totalProperties ?? 0} />
              <Card title="Usuários" value={data?.totalUsers ?? 0} />
              <Card title="Ofertas" value={data?.totalOffers ?? 0} />
              <Card title="Pagamentos" value={data?.totalPayments ?? 0} />
              <Card
                title="Receita"
                value={`R$ ${Number(data?.totalRevenue ?? 0).toLocaleString(
                  "pt-BR"
                )}`}
              />
            </div>

            <div className="mt-8">
              <h2 className="mb-4 text-xl font-bold">Gerenciar</h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <QuickAction
                  title="Gerenciar Imóveis"
                  description="Visualize, filtre e modere todos os anúncios."
                  href="/admin/imoveis"
                />

                <QuickAction
                  title="Gerenciar Usuários"
                  description="Controle usuários e permissões administrativas."
                  href="/admin/usuarios"
                />

                <QuickAction
                  title="Gerenciar Ofertas"
                  description="Acompanhe propostas, status e moderação."
                  href="/admin/ofertas"
                />

                <QuickAction
                  title="Gerenciar Pagamentos"
                  description="Veja taxas, PayPal e status financeiros."
                  href="/admin/pagamentos"
                />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-slate-400">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
    >
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-slate-400">{description}</div>
    </Link>
  );
}