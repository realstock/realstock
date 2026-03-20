"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="mb-6 text-center text-2xl font-bold">
          Entrar no RealStock
        </h1>

        <button
          onClick={() =>
            signIn("google", {
              callbackUrl: "/",
            })
          }
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-200"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="h-5 w-5"
          />
          Entrar com Google
        </button>

        <p className="mt-6 text-center text-sm text-slate-400">
          Ao continuar, você concorda com nossos termos.
        </p>
      </div>
    </main>
  );
}
