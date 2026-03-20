"use client";

import { useState } from "react";

export default function LoginModal({ onClose }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: any) {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("realstock_user", JSON.stringify(data.user));
      window.location.reload();
    } else {
      alert("Login inválido");
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-screen items-start justify-center px-4 pt-28">
        <div className="w-full max-w-[420px] rounded-3xl border border-white/10 bg-slate-950 p-8 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Entrar</h2>
              <p className="mt-1 text-sm text-slate-400">
                Acesse sua conta para anunciar imóveis.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:text-white"
            >
              fechar
            </button>
          </div>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                type="email"
                placeholder="voce@email.com"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Senha</label>
              <input
                type="password"
                placeholder="Sua senha"
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="w-full rounded-xl bg-white py-3 font-semibold text-slate-900">
              Entrar
            </button>
          </form>

          <button
            onClick={onClose}
            className="mt-4 w-full text-sm text-slate-400 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}