"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import AdSenseBanner from "./AdSenseBanner";
import { useListingType } from "@/context/ListingTypeContext";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const user = session?.user;
  const isAdmin = (user as any)?.role === "ADMIN";
  const debugRole = (user as any)?.role;

  console.log("SESSION:", session);

  return (
    <header className="border-b border-white/10 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-[1600px] h-[70px] lg:h-[90px] items-center justify-between px-2.5 sm:px-4 lg:px-6 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-5 min-w-0">
          <Link href="/" className="block shrink-0 w-[85px] xs:w-[105px] md:w-[150px] lg:w-[190px]">
            <Image
              src="/logo-realstock.jpg"
              alt="RealStock"
              width={500}
              height={120}
              className="h-[30px] sm:h-[35px] lg:h-[55px] w-full object-fill"
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
        <div className="hidden lg:flex flex-1 mx-8 h-[90px] max-h-[90px] items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center -z-10 text-slate-700 text-xs text-dashed border border-white/5 rounded-xl">Anúncio Global</div>
          <AdSenseBanner 
            slot="7835437222"
            format="" 
            responsive="false" 
            style={{ display: "inline-block", width: "728px", height: "90px" }} 
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === "loading" ? null : user ? (
            <div className="z-[9999] flex items-center gap-2">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-white/10 cursor-pointer"
                >
                  <span className="truncate max-w-[85px] xs:max-w-[120px] sm:max-w-[180px] md:max-w-none">
                    Olá, {user.name ? user.name.split(" ")[0] : (user.email?.split("@")[0] || "Conta")}
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full z-[9999] mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                    <Link
                      href="/anunciar"
                      className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      Anunciar imóvel
                    </Link>

                    <Link
                      href="/"
                      className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      Pesquisar imóvel
                    </Link>

                    <Link
                      href="/minha-conta/anuncios"
                      className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      Meus anúncios
                    </Link>

                    <Link
                      href="/minha-conta/ofertas"
                      className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      {listingType === "ALUGUEL_TEMPORADA" ? "Minhas reservas" : "Minhas ofertas"}
                    </Link>

                    <Link
                      href="/minha-conta/chat"
                      className="block rounded-xl px-4 py-3 text-sm text-emerald-400 font-medium hover:bg-white/10 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Chat / Mensagens
                    </Link>

                    <Link
                      href="/minha-conta/perfil"
                      className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      Meu cadastro
                    </Link>

                    <Link
                      href="/instrucoes"
                      className="block rounded-xl px-4 py-3 text-sm text-sky-400 hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      Como usar o site
                    </Link>

                    {isAdmin && (
                      <>
                        <div className="my-2 h-px bg-white/10" />
                        <Link
                          href="/admin"
                          className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10"
                          onClick={() => setMenuOpen(false)}
                        >
                          Administração
                        </Link>
                        <span className="text-xs text-yellow-300 block px-4 py-1">
                          role: {debugRole || "sem-role"}
                        </span>
                      </>
                    )}

                    <div className="my-2 h-px bg-white/10" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full text-left rounded-xl px-4 py-2.5 text-sm text-red-400 font-bold hover:bg-white/10 transition cursor-pointer"
                    >
                      Sair da conta
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden sm:block rounded-xl border border-red-400/20 bg-red-400/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-red-300 hover:bg-red-400/15"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-white/10"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}