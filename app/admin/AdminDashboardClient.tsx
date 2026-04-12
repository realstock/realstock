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

export default function AdminDashboardClient() {
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

                <QuickAction
                  title="Patrocínios Ativos"
                  description="Visualize e gerencie os imóveis com patrocínio Premium Global em andamento."
                  href="/admin/patrocinados"
                  icon={<GemIcon />}
                />

                <QuickAction
                  title="Taxas e Serviços"
                  description="Cadastre taxas, serviços do site e defina qual taxa será aplicada a cada serviço."
                  href="/admin/taxas-servicos"
                  icon={<SettingsIcon />}
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
  external,
  icon,
}: {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
    >
      <div className="flex items-center gap-2 text-lg font-semibold">
        {icon}
        {title}
      </div>
      <div className="mt-2 text-sm text-slate-400">{description}</div>
    </Link>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-pink-500"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-cyan-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82L4.21 7.2a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function GemIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 text-yellow-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}