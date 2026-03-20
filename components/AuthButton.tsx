"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("realstock_user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  if (!user) {
    return (
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white"
        >
          Entrar
        </Link>

        <Link
          href="/cadastro"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Cadastrar
        </Link>
      </div>
    );
  }

  return (
  <div className="flex gap-3">
    <Link
      href="/minha-conta"
      className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white"
    >
      Minha conta
    </Link>

    <Link
      href="/anunciar"
      className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
    >
      Anunciar imóvel
    </Link>
  </div>
);
}