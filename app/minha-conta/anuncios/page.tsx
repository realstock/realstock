"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Property = {
  id: number;
  title: string;
  price: number | string;
  city: string;
  state?: string;
  neighborhood?: string;
  images?: { imageUrl?: string; url?: string }[];
};

export default function MeusAnunciosPage() {
  const [user, setUser] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const stored = localStorage.getItem("realstock_user");

        if (!stored) {
          setError("Usuário não autenticado.");
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);

        const res = await fetch(
          `/api/minha-conta/anuncios?owner_id=${parsedUser.id}`
        );

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao carregar anúncios.");
        }

        setProperties(data.properties || []);
      } catch (err: any) {
        console.error("Erro ao carregar anúncios:", err);
        setError(err.message || "Erro ao carregar anúncios.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Meus anúncios</h1>
        <p className="text-slate-400">Gerencie seus imóveis anunciados.</p>
      </div>

      {loading && <div className="text-slate-400">Carregando anúncios...</div>}

      {!loading && error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && properties.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-slate-400">
          Você ainda não possui anúncios cadastrados.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {properties.map((property) => {
          const image =
            property.images?.[0]?.imageUrl ||
            property.images?.[0]?.url ||
            "/placeholder.jpg";

          return (
            <div
              key={property.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-xl"
            >
              <div className="h-[200px] w-full overflow-hidden">
                <img
                  src={image}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-3 p-4">
                <h2 className="text-lg font-bold leading-tight">
                  {property.title}
                </h2>

                <p className="text-sm text-slate-400">
                  {[property.neighborhood, property.city, property.state]
                    .filter(Boolean)
                    .join(" • ")}
                </p>

                <div className="text-xl font-bold text-emerald-400">
                  R$ {Number(property.price).toLocaleString("pt-BR")}
                </div>

                <div className="flex gap-3 pt-2">
  <Link
    href={`/anunciar/${property.id}`}
    className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-center text-sm text-white hover:bg-white/10"
  >
    Editar anúncio
  </Link>

  <Link
    href={`/imovel/${property.id}`}
    className="flex-1 rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900"
  >
    Ver anúncio
  </Link>

  <Link
    href={`/minha-conta/anuncios/${property.id}/ofertas`}
    className="flex-1 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-center text-sm text-emerald-300 hover:bg-emerald-400/15"
  >
    Gerenciar ofertas
  </Link>
</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}