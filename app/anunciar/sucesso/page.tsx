"use client";

import { useEffect } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { CheckCircle2, Rocket, ArrowRight } from "lucide-react";

export default function AnuncioSucessoPage() {
  useEffect(() => {
    // Solta os fogos/confetes assim que a página renderizar
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // Fogo 1
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      // Fogo 2
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white relative overflow-hidden">
      {/* Background blurs */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-lg text-center bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md shadow-2xl">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <CheckCircle2 size={48} className="text-emerald-400" />
        </div>

        <h1 className="mb-4 text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
          Parabéns!
        </h1>
        <h2 className="mb-6 text-xl font-medium text-slate-300">
          Seu imóvel foi publicado com sucesso.
        </h2>

        <p className="mb-10 text-slate-400 leading-relaxed">
          Agora acesse <b className="text-white">Meus Anúncios</b> e veja tudo que podemos fazer para sua venda se concretizar o mais rápido possível.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row justify-center">
          <Link
            href="/minha-conta/anuncios"
            className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-4 font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            Acessar Meus Anúncios
            <ArrowRight size={20} />
          </Link>

          <Link
            href="/anunciar"
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 font-bold text-white hover:bg-white/10 transition-colors"
          >
            Publicar Novo Imóvel
          </Link>
        </div>
      </div>
    </main>
  );
}
