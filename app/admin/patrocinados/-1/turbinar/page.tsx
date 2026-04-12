"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Rocket } from "lucide-react";
import { Suspense } from "react";

function TurbinarContent() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform") || "instagram";

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && (session?.user as any)?.role !== "ADMIN") {
      router.push("/");
    }
  }, [status, router, session]);

  async function handleBoost() {
    try {
      setIsPublishing(true);
      setError("");

      const res = await fetch("/api/admin/patrocinados/turbinar-boost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) throw new Error(result.error || "Erro ao turbinar portfólio.");

      setSuccessMsg(result.message || "Campanha de tráfego aplicada globalmente!");
    } catch (err: any) {
      setError(err.message || "Erro interno.");
    } finally {
      setIsPublishing(false);
    }
  }

  const platformNames: Record<string, string> = {
    instagram: "Instagram (Meta Ads)",
    facebook: "Facebook (Meta Ads)",
    google: "Google Ads",
  };

  const getGradient = () => {
    if (platform === "instagram") return "from-purple-500/10 to-indigo-500/5";
    if (platform === "facebook") return "from-blue-500/10 to-indigo-500/5";
    if (platform === "google") return "from-emerald-500/10 to-teal-500/5";
    return "";
  };

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl text-slate-400">Verificando permissões VIP...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-lg">
        <div className="mb-6">
          <Link href="/admin/patrocinados" className="text-sm text-slate-400 hover:text-white">
            ← Voltar à lista VIP
          </Link>
          <h1 className="mt-4 text-3xl font-bold flex items-center gap-2">
             <Rocket size={28} className="text-indigo-400" />
             Turbinar Global - {platformNames[platform] || "Tráfego Pago"}
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            Estenda por padrão 15 dias a verba da Imobiliária neste canal para as publicações do Portfólio Global (Administrativo).
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {successMsg ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-center text-emerald-300">
            <h2 className="text-xl font-bold mb-2">Tráfego Otimizado!</h2>
            <p>{successMsg}</p>
             <div className="mt-6">
              <Link href="/admin/patrocinados" className="text-emerald-200 underline font-semibold">
                Voltar à Lista de Patrocinados
              </Link>
             </div>
          </div>
        ) : (
          <div className={`rounded-2xl border border-indigo-500/20 bg-gradient-to-br ${getGradient()} p-6 shadow-xl`}>
             <h2 className="text-lg font-semibold mb-4">Ação de Tráfego: {platformNames[platform]}</h2>
             
             <ul className="space-y-3 text-sm text-slate-300 mb-8 font-medium">
               <li>✨ Impulsiona massivamente o alcance</li>
               <li>🚀 Entrega para compradores potenciais ativados (Lookalike)</li>
               <li>📅 +15 dias corridos de cobertura premium</li>
             </ul>

             {isPublishing ? (
                 <div className="text-center py-4 text-indigo-300 animate-pulse font-semibold">
                     Consolidando pacote e injetando orçamento...
                 </div>
             ) : (
                <button
                  onClick={handleBoost}
                  className={`w-full rounded-2xl px-6 py-4 text-center font-bold text-white transition hover:opacity-90 uppercase ${platform === 'google' ? 'bg-emerald-600 border-emerald-500' : 'bg-indigo-600 border-indigo-500'} border-b-4 active:border-b-0 active:mt-1`}
                >
                  Confirmar Investimento Interno
                </button>
             )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function AdminTurbinarGlobalPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950 px-6 py-8"><div className="mx-auto max-w-lg text-white">Carregando painel de tráfego...</div></main>}>
      <TurbinarContent />
    </Suspense>
  );
}
