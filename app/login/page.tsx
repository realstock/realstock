"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingPayPal, setLoadingPayPal] = useState(false);
  const [loadingFacebook, setLoadingFacebook] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingEmail(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoadingEmail(false);

    if (result?.error) {
      setError("Email ou senha inválidos.");
      return;
    }

    router.replace("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Entrar no RealStock
        </h1>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
              placeholder="Sua senha"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loadingEmail || loadingGoogle || loadingPayPal || loadingFacebook}
            className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
          >
            {loadingEmail ? "Entrando..." : "Entrar com email"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
            ou
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={async () => {
            setLoadingGoogle(true);
            await signIn("google", { callbackUrl: "/" });
          }}
          disabled={loadingGoogle || loadingPayPal || loadingFacebook || loadingEmail}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-60 mb-3"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
        {/* Botão de Facebook oculto temporariamente enquanto a configuração das permissões (email) está pendente no Meta Developer Dashboard.
        <button
          onClick={async () => {
            setLoadingFacebook(true);
            await signIn("facebook", { callbackUrl: "/" });
          }}
          disabled={loadingFacebook || loadingGoogle || loadingPayPal || loadingEmail}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1877f2] px-4 py-3 font-semibold text-white transition hover:bg-[#166fe5] disabled:opacity-60 mb-3"
        >
          <svg className="h-5 w-5 text-white fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {loadingFacebook ? "Abrindo Facebook..." : "Entrar com Facebook"}
        </button>
        */}

        {/* Botão de PayPal oculto temporariamente enquanto a aprovação de Compliance (App Live) está "Pending" no PayPal Developer Dashboard.
        <button
          onClick={async () => {
            setLoadingPayPal(true);
            await signIn("paypal", { callbackUrl: "/" });
          }}
          disabled={loadingPayPal || loadingFacebook || loadingGoogle || loadingEmail}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#003087] px-4 py-3 font-semibold text-white transition hover:bg-[#002266] disabled:opacity-60"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
            alt="PayPal"
            className="h-5 object-contain brightness-0 invert"
          />
          {loadingPayPal ? "Abrindo PayPal..." : "Entrar com PayPal"}
        </button>
        */}

        <div className="mt-6 text-center text-sm text-slate-400">
          Não tem conta?{" "}
          <a href="/cadastro" className="text-white hover:underline">
            Cadastre-se
          </a>
        </div>

        <div className="mt-3 text-center text-sm text-slate-400">
          <a href="/esqueci-senha" className="hover:underline">
            Esqueci minha senha
          </a>
        </div>
      </div>
    </main>
  );
}