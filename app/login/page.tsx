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
            disabled={loadingEmail}
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
          disabled={loadingGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-200 disabled:opacity-60 mb-3"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
          {loadingGoogle ? "Abrindo Google..." : "Entrar com Google"}
        </button>

        <button
          onClick={async () => {
            setLoadingGoogle(true); // Reusing loading state for simplicity
            await signIn("paypal", { callbackUrl: "/" });
          }}
          disabled={loadingGoogle}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#003087] px-4 py-3 font-semibold text-white transition hover:bg-[#002266] disabled:opacity-60"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
            alt="PayPal"
            className="h-5 object-contain brightness-0 invert"
          />
          {loadingGoogle ? "Abrindo PayPal..." : "Entrar com PayPal"}
        </button>

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