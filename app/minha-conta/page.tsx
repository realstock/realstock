"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function MinhaContaPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("realstock_user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    setUser(JSON.parse(stored));
  }, []);

  function handleLogout() {
    localStorage.removeItem("realstock_user");
    window.location.href = "/";
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg group"
          >
            <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
            Voltar para o Início
          </Link>
        </div>
        <div className="mb-8">
          <div className="text-sm text-slate-400">Minha conta</div>
          <h1 className="mt-2 text-4xl font-bold">Olá, {user.userName || user.user_name}</h1>
          <p className="mt-2 text-slate-400">
            Gerencie seus anúncios e acompanhe suas ofertas.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/minha-conta/anuncios"
            className="rounded-[28px] border border-white/10 bg-white/5 p-8 transition hover:border-white/20"
          >
            <div className="text-sm text-slate-400">Área do vendedor</div>
            <div className="mt-2 text-2xl font-bold">Meus anúncios</div>
            <p className="mt-3 text-slate-300">
              Veja os imóveis que você publicou e acompanhe as ofertas recebidas.
            </p>
          </Link>

          <Link
            href="/minha-conta/ofertas"
            className="rounded-[28px] border border-white/10 bg-white/5 p-8 transition hover:border-white/20"
          >
            <div className="text-sm text-slate-400">Área do comprador</div>
            <div className="mt-2 text-2xl font-bold">Minhas ofertas</div>
            <p className="mt-3 text-slate-300">
              Acompanhe todas as propostas que você enviou para os anúncios.
            </p>
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm text-red-300"
        >
          Sair da conta
        </button>
      </section>
    </main>
  );
}