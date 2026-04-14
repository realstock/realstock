"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Gem, CalendarClock, ExternalLink, MapPin, Rocket, Camera, CheckCircle2, BarChart3, Plus, Trash, CheckSquare, Square } from "lucide-react";

export default function AdminPatrocinadosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  
  const [instagramPosts, setInstagramPosts] = useState<any[]>([]);
  const [facebookPosts, setFacebookPosts] = useState<any[]>([]);
  const [portfolioBoostedUntil, setPortfolioBoostedUntil] = useState<Date | null>(null);
  const [googlePortfolioBoostedUntil, setGooglePortfolioBoostedUntil] = useState<Date | null>(null);
  const [metaPortfolioBoostedUntil, setMetaPortfolioBoostedUntil] = useState<Date | null>(null);

  const [error, setError] = useState("");
  
  // Selection Logic
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pubName, setPubName] = useState("");
  const [isCreatingPub, setIsCreatingPub] = useState(false);

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
      loadProperties();
    }
  }, [status, router, session]);

  async function loadProperties() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/patrocinados");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar anúncios patrocinados");
      }

      setProperties(data.properties || []);
      setPublications(data.publications || []);
      setInstagramPosts(data.instagramPosts || []);
      setFacebookPosts(data.facebookPosts || []);
      setPortfolioBoostedUntil(data.portfolioBoostedUntil ? new Date(data.portfolioBoostedUntil) : null);
      setGooglePortfolioBoostedUntil(data.googlePortfolioBoostedUntil ? new Date(data.googlePortfolioBoostedUntil) : null);
      setMetaPortfolioBoostedUntil(data.metaPortfolioBoostedUntil ? new Date(data.metaPortfolioBoostedUntil) : null);
    } catch (err: any) {
      setError(err.message || "Erro de conexão com servidor.");
    } finally {
      setLoading(false);
    }
  }

  function togglePropertySelection(id: number) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(pid => pid !== id);
      if (prev.length >= 10) {
        alert("Máximo de 10 imóveis por publicação alcançado!");
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleCreatePublication() {
    if (selectedIds.length === 0) return alert("Selecione pelo menos um imóvel");

    try {
      setIsCreatingPub(true);
      const res = await fetch("/api/admin/patrocinados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pubName || `Lote Automático - ${new Date().toLocaleDateString()}`,
          propertyIds: selectedIds
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setPubName("");
      setSelectedIds([]);
      loadProperties();
      
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsCreatingPub(false);
    }
  }

  async function handleDeletePublication(id: string) {
    if (!confirm("Tem certeza que deseja apagar essa caixinha de lote? As postagens sociais não serão desfeitas.")) return;
    try {
      const res = await fetch(`/api/admin/patrocinados/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setPublications(prev => prev.filter(p => p.id !== id));
    } catch {
      alert("Falha ao apagar publicação");
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
        <div className="mx-auto max-w-6xl text-slate-400">Carregando painel VIP...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6 font-semibold text-red-400">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2 text-yellow-500">
              <Gem size={32} className="text-yellow-400" />
              Anúncios Patrocinados (Ativos)
            </h1>
            <p className="mt-2 text-slate-400">
              Gestão de imóveis premium com patrocínio global ativo.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Voltar
          </Link>
        </div>

        {/* ======================================================== */}
        {/* Lotes Agrupados */}
        {/* ======================================================== */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            Lotes Fechados (Até 10 Imóveis)
          </h2>
          
          {publications.length === 0 ? (
            <div className="text-sm text-slate-500 italic p-4 bg-slate-900 rounded-xl border border-white/5">Nenhum lote foi criado ainda. Selecione os imóveis abaixo e monte seu pacote!</div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publications.map(pub => {
                const isPubPublished = instagramPosts.find(p => p.listingId === -2 && p.caption?.includes(pub.id)); // Temporary hack or use DB fields.
                // We'll rely on global UI hooks for these cards, using their specific pubId
                return (
                  <div key={pub.id} className="rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-slate-900/50 p-5 shadow-lg relative">
                    <button onClick={() => handleDeletePublication(pub.id)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition"><Trash size={16} /></button>
                    <h3 className="text-lg font-bold text-indigo-400 mb-1">{pub.name || "Lote Sem Nome"}</h3>
                    <p className="text-xs text-slate-400 mb-4">{new Date(pub.createdAt).toLocaleDateString()} - IDs: {pub.propertyIds?.join(", ")}</p>
                    
                    {pub.metaBoostedUntil && new Date(pub.metaBoostedUntil) > new Date() && (
                      <div className="mb-2 inline-flex items-center gap-1 w-fit rounded bg-indigo-500/20 px-2 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                          <Rocket size={14} /> Meta Ads ativado
                      </div>
                    )}

                    {pub.googleBoostedUntil && new Date(pub.googleBoostedUntil) > new Date() && (
                      <div className="mb-2 inline-flex items-center gap-1 w-fit rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          <Rocket size={14} /> Google Ads ativado
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 w-full mt-2">
                        <Link href={`/admin/patrocinados/${pub.id}/instagram`} className="flex items-center justify-center gap-1 rounded-xl border border-pink-400/20 bg-pink-500/10 py-2 text-xs font-semibold text-pink-300 hover:bg-pink-500/20 transition-colors">
                          <img src="/icones/instagram.jpg" className="w-4 h-4 rounded" alt="Instagram" /> Postar
                        </Link>
                        <Link href={`/admin/patrocinados/${pub.id}/facebook`} className="flex items-center justify-center gap-1 rounded-xl border border-blue-400/20 bg-blue-500/10 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 transition-colors">
                           <img src="/icones/facebook.jpeg" className="w-4 h-4 rounded" alt="Facebook" /> Postar
                        </Link>
                        <Link href={`/admin/patrocinados/${pub.id}/turbinar?platform=google`} className="flex items-center justify-center gap-1 rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 py-2 text-xs font-semibold text-emerald-300 hover:from-emerald-500/20 hover:to-teal-500/20 transition-colors">
                          <Rocket size={14} /> Google Ads
                        </Link>
                        <Link href={`/admin/patrocinados/${pub.id}/turbinar?platform=facebook`} className="flex items-center justify-center gap-1 rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                           <Rocket size={14} /> Meta Ads
                        </Link>
                    </div>
                  </div>
                )
              })}
             </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* Box de Seleção em Lote */}
        {/* ======================================================== */}
        
        {selectedIds.length > 0 && (
           <div className="sticky top-4 z-50 mb-8 rounded-2xl border border-sky-500/30 bg-sky-950/80 backdrop-blur-xl p-4 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <span className="font-bold text-sky-400 text-lg">{selectedIds.length}</span> <span className="text-slate-300">imóveis selecionados</span>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                 <input 
                   type="text" 
                   value={pubName}
                   onChange={e => setPubName(e.target.value)}
                   placeholder="Nome do Lote (Ex: Março 2026)" 
                   className="flex-1 md:w-64 input bg-slate-900 border-white/10 text-sm"
                 />
                 <button onClick={handleCreatePublication} disabled={isCreatingPub} className="btn-primary py-2 px-4 whitespace-nowrap">
                   {isCreatingPub ? "Criando..." : <span className="flex items-center gap-1"><Plus size={16}/> Salvar Lote</span>}
                 </button>
              </div>
           </div>
        )}

        {/* ======================================================== */}
        {/* Imóveis Individuais (Tabela) */}
        {/* ======================================================== */}

        {properties.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/50 p-12 text-center text-slate-400">
            Nenhum anúncio patrocinado ativo no momento.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const expireDate = new Date(property.sponsoredUntil);
              const daysLeft = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isSelected = selectedIds.includes(property.id);

              return (
                <div
                  key={property.id}
                  onClick={() => togglePropertySelection(property.id)}
                  className={`rounded-2xl cursor-pointer border p-6 relative overflow-hidden group transition-all duration-200 shadow-lg ${isSelected ? 'border-sky-500 bg-sky-900/20 shadow-sky-500/10' : 'border-white/10 bg-gradient-to-b from-white/5 to-slate-900/50 hover:border-white/30'}`}
                >
                  <div className="absolute top-4 left-4 z-10">
                     {isSelected ? <CheckSquare className="text-sky-400" size={24} /> : <Square className="text-slate-600 group-hover:text-slate-400" size={24} />}
                  </div>

                  <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-950 text-xs font-black px-3 py-1 rounded-bl-xl shadow flex items-center gap-1">
                    💎 Ativo
                  </div>
                  <div className="mb-4 mt-6">
                    <h3 className={`line-clamp-2 text-xl font-bold transition-colors ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {property.title}
                    </h3>
                    <div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
                      <MapPin size={14} />
                      {property.city}, {property.state}
                    </div>
                  </div>

                  <div className="mb-6 space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-2">
                       <span className="text-slate-500">Proprietário</span>
                       <span className="font-semibold text-slate-300">{property.owner?.name?.split(" ")[0]} (ID: {property.owner?.id})</span>
                    </div>
                    <div className="flex justify-between pt-1">
                       <span className="text-slate-500 flex items-center gap-1"><CalendarClock size={16} className="text-yellow-500/80"/> Restante</span>
                       <span className="font-bold text-emerald-400">{daysLeft} dias</span>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                       Vence em: {expireDate.toLocaleDateString("pt-BR")}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 flex gap-2">
                    <Link
                      href={`/imovel/${property.id}`}
                      target="_blank"
                      onClick={e => e.stopPropagation()}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-800 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <ExternalLink size={16} /> Ver Anúncio
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
