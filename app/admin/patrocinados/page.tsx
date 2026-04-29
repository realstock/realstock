"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Gem, CalendarClock, ExternalLink, MapPin, Rocket, Camera, CheckCircle2, BarChart3, Plus, Trash, CheckSquare, Square, Upload, Image as ImageIcon } from "lucide-react";

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
  const [uploadingLogoId, setUploadingLogoId] = useState<string | null>(null);

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
      if (prev.length >= 9) {
        alert("Máximo de 9 imóveis por publicação alcançado (o 10º slide é reservado para o Logo)!");
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

  async function handleLogoUpload(pubId: string, file: File) {
    try {
      setUploadingLogoId(pubId);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Update publication in DB
      const patchRes = await fetch(`/api/admin/patrocinados/${pubId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customLogoUrl: data.imageUrl }),
      });

      const patchData = await patchRes.json();
      if (!patchData.success) throw new Error(patchData.error);

      // Update local state
      setPublications(prev => prev.map(p => p.id === pubId ? { ...p, customLogoUrl: data.imageUrl } : p));
      alert("Logo atualizado com sucesso!");
    } catch (err: any) {
      alert("Erro no upload: " + err.message);
    } finally {
      setUploadingLogoId(null);
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
            <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <ImageIcon size={24} className="text-indigo-400" />
            Lotes Estratégicos (Portfólio Admin)
          </h2>
          
          {publications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center text-slate-500">
               Nenhum lote criado. Selecione imóveis abaixo para montar um novo portfólio.
            </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publications.map(pub => {
                const isPublished = (instagramPosts.find(p => p.listingId === -2 && (p.caption?.includes(pub.id) || p.caption === pub.id)) || 
                                     facebookPosts.find(p => p.listingId === -2 && (p.caption?.includes(pub.id) || p.caption === pub.id)));
                
                return (
                  <div key={pub.id} className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/40 p-6 backdrop-blur-md transition-all hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10">
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-indigo-500/5 blur-3xl transition-all group-hover:bg-indigo-500/10" />
                    
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-xl font-bold text-white truncate pr-8">{pub.name || "Lote Sem Nome"}</h3>
                       <button 
                         onClick={() => handleDeletePublication(pub.id)} 
                         className="text-slate-600 hover:text-red-400 transition-colors"
                       >
                         <Trash size={18} />
                       </button>
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                       <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-dashed border-white/10 bg-slate-800 transition-colors hover:border-indigo-500/50">
                          {pub.customLogoUrl ? (
                            <img src={pub.customLogoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center text-slate-500">
                               <ImageIcon size={28} />
                               <span className="text-[10px] font-black uppercase mt-1">Logo</span>
                            </div>
                          )}
                          <label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-indigo-600/40 transition-opacity hover:bg-indigo-600/80 backdrop-blur-[2px]">
                             <div className="flex flex-col items-center gap-1">
                                <Upload size={20} className="text-white" />
                                <span className="text-[8px] font-black text-white uppercase">Upload</span>
                             </div>
                             <input 
                               type="file" 
                               className="hidden" 
                               accept="image/*"
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (file) handleLogoUpload(pub.id, file);
                               }}
                             />
                          </label>
                          {uploadingLogoId === pub.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                               <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                            </div>
                          )}
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Personalizar Post</span>
                          <p className="text-[10px] text-slate-500 leading-tight">Clique no quadro ao lado para subir uma logo ou banner exclusivo para este lote.</p>
                          <div className="mt-2 flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400">IDs: {Array.isArray(pub.propertyIds) ? pub.propertyIds.join(", ") : "-"}</span>
                             <span className="text-[9px] text-slate-600">Criado: {new Date(pub.createdAt).toLocaleDateString()}</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       <div className="flex flex-wrap gap-2">
                          {pub.metaBoostedUntil && new Date(pub.metaBoostedUntil) > new Date() && (
                            <div className="flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-[10px] font-bold text-indigo-400 border border-indigo-500/20">
                                <Rocket size={12} /> Meta Ads Ativo
                            </div>
                          )}
                          {pub.googleBoostedUntil && new Date(pub.googleBoostedUntil) > new Date() && (
                            <div className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                <Rocket size={12} /> Google Ads Ativo
                            </div>
                          )}
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <Link 
                            href={`/admin/patrocinados/${pub.id}/instagram`} 
                            className="flex items-center justify-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/5 py-2.5 text-xs font-bold text-pink-400 transition-all hover:bg-pink-500/10"
                          >
                             <Plus size={14} /> Insta
                          </Link>
                          <Link 
                            href={`/admin/patrocinados/${pub.id}/facebook`} 
                            className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 py-2.5 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/10"
                          >
                             <Plus size={14} /> Face
                          </Link>
                       </div>

                       <div className="grid grid-cols-2 gap-2">
                          <Link 
                            href={`/admin/patrocinados/${pub.id}/turbinar?platform=meta`} 
                            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white transition-all hover:bg-indigo-500 shadow-lg shadow-indigo-600/20"
                          >
                             <Rocket size={14} /> Meta Ads
                          </Link>
                          <Link 
                            href={`/admin/patrocinados/${pub.id}/turbinar?platform=google`} 
                            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
                          >
                             <Rocket size={14} /> Google Ads
                          </Link>
                       </div>

                       {isPublished && (
                          <Link 
                            href={`/admin/patrocinados/${pub.id}/insights`} 
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 py-2.5 text-xs font-bold text-yellow-500 transition-all hover:bg-yellow-500/10"
                          >
                             <BarChart3 size={14} /> Ver Estatísticas / Insights
                          </Link>
                       )}
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
           <div className="sticky top-6 z-[60] mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="rounded-[32px] border border-white/20 bg-slate-900/60 p-4 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 pl-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
                     <CheckSquare size={24} />
                  </div>
                  <div>
                    <div className="text-lg font-black text-white">{selectedIds.length} Imóveis</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-sky-400">Prontos para novo lote</div>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto pr-2">
                   <input 
                     type="text" 
                     value={pubName}
                     onChange={e => setPubName(e.target.value)}
                     placeholder="Nome do Lote (Ex: Março 2026)" 
                     className="flex-1 md:w-72 rounded-2xl border-white/10 bg-black/40 px-6 py-3 text-sm text-white placeholder:text-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                   />
                   <button 
                     onClick={handleCreatePublication} 
                     disabled={isCreatingPub} 
                     className="group flex items-center gap-2 rounded-2xl bg-sky-600 px-8 py-3 font-black text-white transition-all hover:bg-sky-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg shadow-sky-600/20"
                   >
                     {isCreatingPub ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                     ) : (
                        <>
                          <Plus size={20} className="transition-transform group-hover:rotate-90" /> 
                          Salvar Lote
                        </>
                     )}
                   </button>
                </div>
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const expireDate = new Date(property.sponsoredUntil);
              const daysLeft = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              const isSelected = selectedIds.includes(property.id);
              const isAlreadyPublished = publications.some((pub: any) => pub.propertyIds?.includes(property.id));

              return (
                <div
                  key={property.id}
                  onClick={() => togglePropertySelection(property.id)}
                  className={`group relative flex flex-col overflow-hidden rounded-[32px] border transition-all duration-300 ${
                     isSelected 
                       ? 'border-sky-500 bg-sky-500/10 shadow-[0_0_40px_-10px_rgba(14,165,233,0.3)]' 
                       : isAlreadyPublished
                         ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                         : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img 
                      src={property.images?.[0]?.imageUrl || "/placeholder.jpg"} 
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                    
                    <div className="absolute top-4 left-4">
                       <div className={`flex h-10 w-10 items-center justify-center rounded-2xl backdrop-blur-md transition-all ${isSelected ? 'bg-sky-500 text-white' : 'bg-black/40 text-white/40 group-hover:bg-black/60 group-hover:text-white'}`}>
                          {isSelected ? <CheckCircle2 size={24} /> : <ImageIcon size={24} />}
                       </div>
                    </div>

                    <div className="absolute top-4 right-4">
                       <div className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-xl ${isAlreadyPublished ? 'bg-emerald-500 text-emerald-950' : 'bg-yellow-500 text-yellow-950'}`}>
                          {isAlreadyPublished ? 'Em Lote' : 'VIP Ativo'}
                       </div>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                       <div className="flex items-center gap-2 text-xs font-bold text-white/90">
                          <MapPin size={14} className="text-sky-400" />
                          <span className="truncate">{property.city}, {property.state}</span>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-4">
                       <h3 className="line-clamp-2 text-lg font-bold text-white group-hover:text-sky-400 transition-colors">
                         {property.title}
                       </h3>
                       <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-500">ID: {property.id}</span>
                          <span className="text-xs font-black text-emerald-400">{daysLeft} dias restantes</span>
                       </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Proprietário</span>
                          <span className="text-sm font-semibold text-slate-300">{property.owner?.name?.split(" ")[0]}</span>
                       </div>
                       <Link
                         href={`/imovel/${property.id}`}
                         target="_blank"
                         onClick={e => e.stopPropagation()}
                         className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                       >
                         <ExternalLink size={18} />
                       </Link>
                    </div>
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
