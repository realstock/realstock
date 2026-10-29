"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import AdSenseBanner from "./AdSenseBanner";
import { useListingType } from "@/context/ListingTypeContext";
import { User, LogIn } from "lucide-react";

export default function Header() {
  const { data: session, status } = useSession();
  const { listingType, setListingType } = useListingType();
  const router = useRouter();
  const pathname = usePathname();

  const [hasNewMessage, setHasNewMessage] = useState(false);
  const latestIncomingIdRef = useRef<number | null>(null);

  const user = session?.user;
  const userId = (user as any)?.id ? Number((user as any).id) : null;
  const isAdmin = (user as any)?.role === "ADMIN";

  const checkUnread = useCallback(async () => {
    if (!userId) {
      setHasNewMessage(false);
      return;
    }
    try {
      const res = await fetch("/api/chat/unread");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const latestId = data.latestId as number | null;
      latestIncomingIdRef.current = latestId;

      if (!latestId) {
        setHasNewMessage(false);
        return;
      }

      const storageKey = `realstock_chat_last_seen_${userId}`;
      if (pathname.startsWith("/minha-conta/chat")) {
        localStorage.setItem(storageKey, String(latestId));
        setHasNewMessage(false);
        return;
      }

      const lastSeenStr = localStorage.getItem(storageKey);
      if (!lastSeenStr) {
        setHasNewMessage(true);
      } else {
        setHasNewMessage(latestId > Number(lastSeenStr));
      }
    } catch (err) {
      console.error("Erro ao verificar mensagens não lidas:", err);
    }
  }, [userId, pathname]);

  useEffect(() => {
    if (!userId) {
      setHasNewMessage(false);
      return;
    }

    checkUnread();

    const interval = setInterval(checkUnread, 15000);

    const handleRead = () => {
      if (userId && latestIncomingIdRef.current) {
        localStorage.setItem(`realstock_chat_last_seen_${userId}`, String(latestIncomingIdRef.current));
      }
      setHasNewMessage(false);
    };

    window.addEventListener("realstock_chat_read", handleRead);
    window.addEventListener("storage", checkUnread);

    return () => {
      clearInterval(interval);
      window.removeEventListener("realstock_chat_read", handleRead);
      window.removeEventListener("storage", checkUnread);
    };
  }, [userId, checkUnread]);

  useEffect(() => {
    if (pathname.startsWith("/minha-conta/chat") && userId && latestIncomingIdRef.current) {
      localStorage.setItem(`realstock_chat_last_seen_${userId}`, String(latestIncomingIdRef.current));
      setHasNewMessage(false);
    }
  }, [pathname, userId]);

  function handleTypeSwitch(type: "COMPRA_VENDA" | "ALUGUEL_TEMPORADA") {
    setListingType(type);
    if (session?.user && pathname !== "/") {
      router.push("/");
    }
  }

  return (
    <header className="border-b border-white/10 bg-slate-950 text-white">
      {/* Linha superior: Logo, Switcher (Desktop), AdSense, Perfil / Login */}
      <div className="mx-auto flex max-w-[1600px] h-[58px] sm:h-[70px] lg:h-[80px] items-center justify-between px-3 sm:px-4 lg:px-6 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-5 min-w-0">
          <Link href="/" className="block shrink-0">
            <Image
              src="/logo-realstock.jpg"
              alt="RealStock"
              width={1280}
              height={629}
              className="h-[34px] sm:h-[44px] lg:h-[52px] w-auto object-contain"
              priority
            />
          </Link>

          {/* Switcher Compra e Venda / Temporada (Desktop / Tablet >= 640px) */}
          <div className="hidden sm:flex rounded-xl bg-slate-900 border border-white/10 p-[3px] select-none shrink-0 shadow-inner">
            <button
              onClick={() => handleTypeSwitch("COMPRA_VENDA")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                listingType === "COMPRA_VENDA"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Compra e Venda
            </button>
            <button
              onClick={() => handleTypeSwitch("ALUGUEL_TEMPORADA")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                listingType === "ALUGUEL_TEMPORADA"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Aluguel Temporada
            </button>
          </div>
        </div>

        {/* Espaço reservado para o Banner do Google Ads (Apenas telas grandes) */}
        <div className="hidden lg:flex flex-1 mx-8 h-[80px] max-h-[80px] items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10 text-slate-700 text-xs text-dashed border border-white/5 rounded-xl">Anúncio Global</div>
          <AdSenseBanner 
            slot="7835437222"
            format="" 
            responsive="false" 
            style={{ display: "inline-block", width: "728px", height: "90px" }} 
          />
        </div>

        {/* Top Right: Nome do Usuário ou Botão Entrar */}
        <div className="flex items-center gap-2 shrink-0">
          {status === "loading" ? (
            <div className="h-8 w-20 bg-white/5 animate-pulse rounded-xl" />
          ) : user ? (
            <Link
              href="/minha-conta/perfil"
              title="Meu Cadastro / Perfil"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-200 bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-white/25 px-2.5 sm:px-3.5 py-1.5 rounded-xl transition duration-200 group shadow-sm"
            >
              <User className="h-3.5 w-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-[105px] xs:max-w-[130px] sm:max-w-[200px]">
                Olá, {user.name ? user.name.split(" ")[0] : (user.email?.split("@")[0] || "Conta")}
              </span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 px-3 sm:px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 transition shadow-sm"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Entrar</span>
            </Link>
          )}
        </div>
      </div>

      {/* Switcher Compra e Venda / Temporada (Mobile < 640px) */}
      <div className="sm:hidden px-3 pt-1 pb-2 bg-slate-950 border-t border-white/5">
        <div className="grid grid-cols-2 rounded-xl bg-slate-900/90 border border-white/10 p-1 select-none gap-1 shadow-inner">
          <button
            onClick={() => handleTypeSwitch("COMPRA_VENDA")}
            className={`rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
              listingType === "COMPRA_VENDA"
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🏢</span>
            <span>Compra e Venda</span>
          </button>
          <button
            onClick={() => handleTypeSwitch("ALUGUEL_TEMPORADA")}
            className={`rounded-lg py-2 text-[11px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 ${
              listingType === "ALUGUEL_TEMPORADA"
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>🏖️</span>
            <span>Temporada</span>
          </button>
        </div>
      </div>

      {/* Linha Horizontal de Links do Menu (Abaixo da logo até o botão Sair da conta) */}
      <div className="border-t border-white/10 bg-slate-900/70">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-2.5 sm:px-4 lg:px-6 py-2 overflow-x-auto gap-2 scrollbar-none">
          <nav className="flex items-center gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm">
            {user ? (
              <>
                <Link
                  href="/anunciar"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/anunciar"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Anunciar imóvel
                </Link>

                <Link
                  href="/"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Pesquisar imóvel
                </Link>

                <Link
                  href="/minha-conta/anuncios"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname.startsWith("/minha-conta/anuncios")
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Meus anúncios
                </Link>

                <Link
                  href="/minha-conta/ofertas"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname.startsWith("/minha-conta/ofertas")
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  {listingType === "ALUGUEL_TEMPORADA" ? "Minhas reservas" : "Minhas ofertas"}
                </Link>

                <Link
                  href="/minha-conta/chat"
                  onClick={() => {
                    if (userId && latestIncomingIdRef.current) {
                      localStorage.setItem(`realstock_chat_last_seen_${userId}`, String(latestIncomingIdRef.current));
                    }
                    setHasNewMessage(false);
                  }}
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                    pathname.startsWith("/minha-conta/chat")
                      ? "bg-blue-600 text-white font-semibold"
                      : hasNewMessage
                      ? "text-emerald-400 font-bold bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <span>Chat / Mensagens</span>
                  {hasNewMessage && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </Link>

                <Link
                  href="/minha-conta/perfil"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname.startsWith("/minha-conta/perfil")
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Meu cadastro
                </Link>

                <Link
                  href="/instrucoes"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/instrucoes"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  Como usar o site
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                      pathname.startsWith("/admin")
                        ? "bg-blue-600 text-white font-semibold"
                        : "text-white hover:bg-white/10"
                    }`}
                  >
                    Administração
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/"
                className="rounded-lg px-2.5 sm:px-3 py-1.5 bg-blue-600 text-white font-semibold transition-colors"
              >
                Pesquisar imóvel
              </Link>
            )}
          </nav>

          {/* Botão Sair da conta no canto direito da barra horizontal */}
          {user ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="shrink-0 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer"
            >
              Sair da conta
            </button>
          ) : (
            <Link
              href="/login"
              className="shrink-0 rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-white hover:bg-white/10 transition cursor-pointer"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}