"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Gem } from "lucide-react";

export default function AdminPortfolioInstagramPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/admin/patrocinados`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar patrocínios.");
      }

      const propsWithImg = data.properties.filter((p: any) => p.images && p.images.length > 0);
      setProperties(propsWithImg);
      setSelectedIds(propsWithImg.slice(0, 10).map((p: any) => p.id));
    } catch (err: any) {
      setError(err.message || "Erro de servidor.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated") {
      if ((session?.user as any)?.role !== "ADMIN") {
        router.push("/");
        return;
      }
      loadData();
    }
  }, [status, router, session]);

  async function handlePublish() {
    try {
      setIsPublishing(true);
      setError("");
      
      const res = await fetch("/api/admin/patrocinados/publish-instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPropertyIds: selectedIds }),
      });
      const result = await res.json();
      
      if (!res.ok || !result.success) throw new Error(result.error || "Erro ao publicar no Instagram.");
      
      setSuccessMsg(result.message || "Carrossel Global postado com sucesso no Instagram!");
    } catch (err: any) {
      setError(err.message || "Erro interno.");
    } finally {
      setIsPublishing(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl text-slate-400">Carregando recursos VIP...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link href="/admin/patrocinados" className="text-sm text-slate-400 hover:text-white">
            ← Voltar à lista VIP
          </Link>
          <h1 className="mt-4 text-3xl font-bold flex items-center gap-2 text-yellow-500">
             <Gem size={28} />
             Publicar Portfólio Global no Instagram
          </h1>
          <p className="mt-2 text-slate-400">
            Ação restrita a Administradores. Cria um carrossel no canal oficial contendo todos os anúncios globalmente patrocinados selecionados.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-300">
            {successMsg}
             <div className="mt-4">
              <Link href="/admin/patrocinados" className="text-emerald-200 underline">
                Voltar à lista
              </Link>
             </div>
          </div>
        )}

        {!successMsg && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-semibold text-yellow-500">Imóveis Ativos Selecionados</h2>
                 <span className="text-sm font-medium px-2 py-1 bg-white/10 rounded-lg">
                    {selectedIds.length} / 10 máx
                 </span>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                 Clique na foto para selecionar ou remover os anúncios dos diferentes usuários que irão compor este super carrossel.
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                 {properties.map((prop, idx) => {
                    const isSelected = selectedIds.includes(prop.id);
                    const isDisabled = !isSelected && selectedIds.length >= 10;
                    
                    return (
                      <div 
                        key={prop.id} 
                        onClick={() => {
                           if (isSelected) {
                              setSelectedIds(prev => prev.filter(id => id !== prop.id));
                           } else if (!isDisabled) {
                              setSelectedIds(prev => [...prev, prop.id]);
                           }
                        }}
                        className={`aspect-square rounded-xl bg-slate-900 border-2 overflow-hidden relative cursor-pointer transition ${isSelected ? 'border-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-transparent opacity-50 hover:opacity-80'} ${isDisabled ? 'cursor-not-allowed grayscale' : ''}`}
                      >
                          <img src={prop.images[0].imageUrl} alt="Capa" className="w-full h-full object-cover" />
                          {isSelected && (
                             <div className="absolute top-1 right-1 bg-yellow-500 text-yellow-950 font-bold rounded-full p-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                             </div>
                          )}
                      </div>
                    );
                 })}
              </div>
            </div>

            <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-orange-500/5 p-6 h-fit">
              <h2 className="text-xl font-semibold mb-2">Despacho para o Instagram</h2>
              <p className="text-slate-400 text-sm mb-6">
                 Diferente dos usuários, perfis administradores não pagam e saltam o gateway de pagamento.
              </p>

              {isPublishing && (
                  <div className="text-center py-6 text-pink-300 animate-pulse font-semibold">
                      Enviando para o Instagram... Em milésimos de segundos ficará pronto!
                  </div>
              )}

              {!isPublishing && (
                <button
                  onClick={handlePublish}
                  disabled={selectedIds.length === 0}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-4 text-center font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                >
                  {selectedIds.length === 0 ? 'Selecione Anúncios Patrocinados' : 'Publicar Agora'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
