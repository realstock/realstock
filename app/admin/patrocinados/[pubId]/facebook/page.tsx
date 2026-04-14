"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Rocket } from "lucide-react";

export default function AdminLoteFacebookPage() {
  const { status } = useSession();
  const router = useRouter();
  const { pubId } = useParams();

  const [loading, setLoading] = useState(true);
  const [publication, setPublication] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [error, setError] = useState("");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") loadData();
  }, [status, pubId]);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch("/api/admin/patrocinados");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const pub = data.publications.find((p: any) => p.id === pubId);
      if (!pub) throw new Error("Publicação não encontrada.");
      
      setPublication(pub);

      const pIds = pub.propertyIds;
      const filteredProps = data.properties.filter((pr: any) => pIds.includes(pr.id));
      setProperties(filteredProps);
    } catch (err: any) {
      setError(err.message || "Erro fatal");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    try {
      setIsPublishing(true);
      setError("");
      
      const res = await fetch(`/api/admin/patrocinados/${pubId}/facebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedPropertyIds: properties.map(p => p.id) })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) throw new Error(data.error);
      
      setSuccessMsg("Lote de Patrocinados publicado com sucesso no Facebook!");
    } catch(err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-400">Carregando lote administrativo do Facebook...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/patrocinados" className="text-slate-400 hover:text-white mb-6 inline-block">← Voltar</Link>
        <h1 className="text-3xl font-bold text-blue-400 flex items-center gap-2">
           <img src="/icones/facebook.jpeg" className="w-8 h-8 rounded-lg" alt="Facebook" />
           Publicar Lote no Facebook: {publication?.name}
        </h1>
        <p className="mt-2 text-slate-400">
           Esta central dispara a coleção de imóveis diretamente na página oficial do Facebook da RealStock como Galeria de Fotos.
        </p>

        {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">{error}</div>}
        {successMsg && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
             {successMsg}
             <div className="mt-4"><Link href="/admin/patrocinados" className="underline">Voltar à Central de Patrocinados</Link></div>
          </div>
        )}

        {!error && !successMsg && (
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                <h3 className="font-semibold text-lg mb-4 text-slate-200">Visão Geral do Lote</h3>
                <div className="grid grid-cols-3 gap-2">
                   {properties.map(p => (
                      <div key={p.id} className="aspect-square bg-slate-800 rounded-xl overflow-hidden relative border border-white/5">
                         {p.images?.[0] ? (
                            <img src={p.images[0].imageUrl} className="w-full h-full object-cover" />
                         ) : (
                            <div className="flex items-center justify-center h-full text-xs text-slate-500">Sem Foto</div>
                         )}
                         <div className="absolute bottom-0 w-full bg-black/60 text-[10px] truncate px-1 text-center font-bold">#{p.id}</div>
                      </div>
                   ))}
                </div>
            </div>

            <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-6 flex flex-col justify-center text-center">
                 <Rocket className="text-blue-400 mx-auto mb-4" size={48} />
                 <h2 className="text-xl font-bold text-white mb-2">Ação Administrativa Liberada</h2>
                 <p className="text-sm text-slate-400 mb-6">Insira esta Galeria no ar na Página do Facebook de forma totalmente gratuita.</p>
                 
                 <button 
                   onClick={handlePublish}
                   disabled={isPublishing} 
                   className="btn-primary w-full bg-gradient-to-r py-4 font-bold text-lg rounded-xl from-blue-500 to-indigo-500 border-none">
                     {isPublishing ? "Criando Galeria Graph API..." : "Publicar Imediatamente"}
                 </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
