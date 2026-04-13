"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  const user = session?.user;
  const isAdmin = (user as any)?.role === "ADMIN";
  const debugRole = (user as any)?.role;

  console.log("SESSION:", session);

  return (
    <header className="border-b border-white/10 bg-slate-950 text-white">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4">
        <Link href="/" className="block w-[340px]">
          <Image
            src="/logo-realstock.jpg"
            alt="RealStock"
            width={500}
            height={120}
            className="h-[90px] w-full object-fill"
            priority
          />
        </Link>

        {/* Espaço reservado para o Banner do Google Ads */}
        <div className="hidden lg:flex flex-1 mx-8 h-[90px] items-center justify-center border border-dashed border-white/20 bg-white/5 rounded-xl text-slate-500 text-sm">
          Espaço para Banner Google Ads (728x90 px)
        </div>

        <div className="flex items-center gap-4">
          {status === "loading" ? null : user ? (
            <div className="z-[9999] flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
                >
                  <span>Olá, {user.name || user.email}</span>
                </button>

                {menuOpen && (
                  <div className="absolute left-0 top-full z-[9999] mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                    <Link
                      href="/anunciar"
                      className="block rounded-xl px-4 py-3 text-sm hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      Anunciar imóvel
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
                      Minhas ofertas
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
                        <span className="text-xs text-yellow-300">
                          role: {debugRole || "sem-role"}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-sm text-red-300 hover:bg-red-400/15"
              >
                Sair
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}