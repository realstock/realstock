"use client";

import { useEffect, useState } from "react";
import AdminBackButton from "@/components/AdminBackButton";
type Property = {
  id: number;
  title: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  price: number;
  status?: string;
  owner?: {
    name?: string;
    email?: string;
  };
};

export default function AdminImoveisPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/imoveis");
        const data = await res.json();

        if (data.success) {
          setProperties(data.properties || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = properties.filter((property) => {
    const text = `${property.title} ${property.city || ""} ${property.neighborhood || ""} ${property.owner?.name || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="mb-6">
            <AdminBackButton /> 
          <h1 className="text-3xl font-bold">Gerenciar Imóveis</h1>
          <p className="mt-1 text-slate-400">
            Liste, filtre e acompanhe os anúncios do sistema.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cidade, bairro ou anunciante"
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-[100px_1.5fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/10 px-4 py-3 text-sm font-semibold text-slate-400">
            <div>ID</div>
            <div>Título</div>
            <div>Cidade</div>
            <div>Bairro</div>
            <div>Valor</div>
            <div>Status</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-slate-400">Carregando imóveis...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-6 text-slate-400">Nenhum imóvel encontrado.</div>
          ) : (
            filtered.map((property) => (
              <div
                key={property.id}
                className="grid grid-cols-[100px_1.5fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 px-4 py-4 text-sm"
              >
                <div>#{property.id}</div>
                <div>{property.title}</div>
                <div>{property.city || "-"}</div>
                <div>{property.neighborhood || "-"}</div>
                <div>R$ {Number(property.price).toLocaleString("pt-BR")}</div>
                <div>{property.status || "-"}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}