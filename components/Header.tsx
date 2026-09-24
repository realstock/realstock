"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import AdSenseBanner from "./AdSenseBanner";
import { useListingType } from "@/context/ListingTypeContext";

export default function Header() {
  const { data: session, status } = useSession();
  const { listingType, setListingType } = useListingType();
  const router = useRouter();
  const pathname = usePathname();

  function handleTypeSwitch(type: "COMPRA_VENDA" | "ALUGUEL_TEMPORADA") {
    setListingType(type);
    if (session?.user && pathname !== "/") {
      router.push("/");
    }
  }

  const user = session?.user;
  const isAdmin = (user as any)?.role === "ADMIN";

  return (
    <header className="border-b border-white/10 bg-slate-950 text-white">
      {/* Linha superior: Logo, Switcher, AdSense, Perfil / Login */}
      <div className="mx-auto flex max-w-[1600px] h-[70px] lg:h-[80px] items-center justify-between px-2.5 sm:px-4 lg:px-6 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5 min-w-0">
          <Link href="/" className="block shrink-0 w-[85px] xs:w-[105px] md:w-[150px] lg:w-[190px]">
            <Image
              src="/logo-realstock.jpg"
              alt="RealStock"
              width={500}
              height={120}
              className="h-[30px] sm:h-[35px] lg:h-[50px] w-full object-fill"
              priority
            />
          </Link>

          {/* Switcher Compra e Venda / Temporada */}
          <div className="flex rounded-xl bg-slate-900 border border-white/10 p-[2px] sm:p-[3px] select-none shrink-0">
            <button
              onClick={() => handleTypeSwitch("COMPRA_VENDA")}
              className={`rounded-lg px-1.5 sm:px-3.5 py-1 sm:py-1.5 text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                listingType === "COMPRA_VENDA"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Compra e Venda
            </button>
            <button
              onClick={() => handleTypeSwitch("ALUGUEL_TEMPORADA")}
              className={`rounded-lg px-1.5 sm:px-3.5 py-1 sm:py-1.5 text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                listingType === "ALUGUEL_TEMPORADA"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Aluguel Temporada
            </button>
          </div>
        </div>

        {/* Espaço reservado para o Banner do Google Ads */}
        <div className="hidden lg:flex flex-1 mx-8 h-[80px] max-h-[80px] items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10 text-slate-700 text-xs text-dashed border border-white/5 rounded-xl">Anúncio Global</div>
          <AdSenseBanner 
            slot="7835437222"
            format="" 
            responsive="false" 
            style={{ display: "inline-block", width: "728px", height: "90px" }} 
          />
        </div>

        {/* Top Right: Cumprimento do Usuário ou Botão Entrar */}
        <div className="flex items-center gap-2 shrink-0">
          {status === "loading" ? null : user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-300 bg-slate-900 border border-white/10 px-2.5 sm:px-3.5 py-1.5 rounded-xl truncate max-w-[120px] sm:max-w-[200px]">
                Olá, {user.name ? user.name.split(" ")[0] : (user.email?.split("@")[0] || "Conta")}
              </span>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-slate-900 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-white/10 transition-colors"
            >
              Entrar
            </Link>
          )}
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
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Anunciar imóvel
                </Link>

                <Link
                  href="/"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Pesquisar imóvel
                </Link>

                <Link
                  href="/minha-conta/anuncios"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname.startsWith("/minha-conta/anuncios")
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Meus anúncios
                </Link>

                <Link
                  href="/minha-conta/ofertas"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname.startsWith("/minha-conta/ofertas")
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {listingType === "ALUGUEL_TEMPORADA" ? "Minhas reservas" : "Minhas ofertas"}
                </Link>

                <Link
                  href="/minha-conta/chat"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${
                    pathname.startsWith("/minha-conta/chat")
                      ? "bg-emerald-600 text-white font-semibold"
                      : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                  }`}
                >
                  Chat / Mensagens
                </Link>

                <Link
                  href="/minha-conta/perfil"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname.startsWith("/minha-conta/perfil")
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Meu cadastro
                </Link>

                <Link
                  href="/instrucoes"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/instrucoes"
                      ? "bg-sky-600 text-white font-semibold"
                      : "text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
                  }`}
                >
                  Como usar o site
                </Link>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                      pathname.startsWith("/admin")
                        ? "bg-yellow-600 text-white font-semibold"
                        : "text-yellow-400 hover:bg-yellow-500/10 hover:text-yellow-300"
                    }`}
                  >
                    Administração
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Pesquisar imóvel
                </Link>
                <Link
                  href="/anunciar"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/anunciar"
                      ? "bg-blue-600 text-white font-semibold"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  Anunciar imóvel
                </Link>
                <Link
                  href="/instrucoes"
                  className={`rounded-lg px-2.5 sm:px-3 py-1.5 transition-colors ${
                    pathname === "/instrucoes"
                      ? "bg-sky-600 text-white font-semibold"
                      : "text-sky-400 hover:bg-sky-500/10 hover:text-sky-300"
                  }`}
                >
                  Como usar o site
                </Link>
              </>
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
              className="shrink-0 rounded-xl border border-white/10 bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-medium hover:bg-white/10 transition cursor-pointer"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}