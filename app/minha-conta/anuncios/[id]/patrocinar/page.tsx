"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Gem, Megaphone, CalendarDays, Wallet } from "lucide-react";

export default function PatrocinarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  
  const siteCharge = Number(service?.fee?.value || 0);

  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      
      const res = await fetch(`/api/minha-conta/anuncios/${id}/patrocinar`);
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar detalhes do anúncio.");
      }
      
      setProperty(data.property);
      setService(data.service);

    } catch (err: any) {
      setError(err.message || "Erro de conexão.");
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
      loadData();
    }
  }, [status, router]);

  async function startPaypalCheckout() {
    try {
      setPaypalError("");
      setPaypalOrderId(null);

      const res = await fetch("/api/paypal/create-sponsor-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar pagamento.");
      }

      setPaypalOrderId(data.paypal_order_id);
    } catch (err: any) {
      setPaypalError(err.message || "Erro interno.");
    }
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  if (status === "loading" || loading) {
    return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white"><div className="mx-auto max-w-4xl text-slate-400">Carregando painel de patrocínio...</div></main>;
  }

  if (error) {
     return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white"><div className="mx-auto max-w-4xl rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">{error}</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/minha-conta/anuncios" className="text-sm text-slate-400 hover:text-white">← Voltar</Link>
            <h1 className="mt-4 text-3xl font-bold flex items-center gap-2 text-yellow-400">
               <Gem size={32} />
               Patrocinar Anúncio Oficialmente
            </h1>
            <p className="mt-2 text-slate-300 font-medium">
               Ganhe o cobiçado selo de <span className="text-yellow-400 font-bold">Patrocinado</span> e deixe a equipe RealStock trabalhar por você globalmente.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-emerald-300">
            <h3 className="font-bold text-xl mb-2">Patrocínio Ativo! 💎</h3>
            <p>{successMsg}</p>
             <div className="mt-6">
              <Link href="/minha-conta/anuncios" className="px-5 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition font-bold">
                Retornar ao painel
              </Link>
             </div>
          </div>
        )}

        {!successMsg && property && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
               <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5 p-8 space-y-6 shadow-2xl shadow-yellow-500/5">
                   <h2 className="text-2xl font-bold text-yellow-500 flex items-center gap-2 mb-2"><Megaphone className="text-yellow-400"/> Benefícios Exclusivos</h2>
                   
                   <p className="text-slate-300 text-lg leading-relaxed">
                     Ao patrocinar, este anúncio será publicado juntamente com outros anúncios selecionados e <strong>participará das massivas campanhas de impulsionamento do site no Instagram, Facebook e Google Ads</strong> financiadas pela imobiliária.
                   </p>
                   <p className="text-slate-300 text-lg leading-relaxed">
                     Esses anúncios patrocinados receberão um <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded font-bold border border-yellow-500/30">SELO EXCLUSIVO NO MAPA</span> e aparecerão destacadamente em uma tela focada de Anúncios Patrocinados na área administrativa da plataforma.
                   </p>

                   <div className="bg-slate-900/80 border border-yellow-500/20 p-5 rounded-xl flex items-start gap-4 mt-6">
                       <CalendarDays className="text-yellow-400" size={28}/>
                       <div>
                          <div className="text-sm text-yellow-400/80 font-bold uppercase">Duração Garantida</div>
                          <div className="font-black text-xl text-white">3 Meses (90 Dias)</div>
                          <div className="text-sm text-slate-400 mt-1">Exibição Premium contínua sem custos diários variáveis.</div>
                       </div>
                   </div>
               </div>
            </div>

            <div className="lg:col-span-5 h-fit sticky top-8">
               <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                   <div className="aspect-[4/3] w-full bg-slate-800 relative">
                       {property.images?.[0]?.imageUrl && (
                           <img src={property.images[0].imageUrl} className="w-full h-full object-cover opacity-60" alt="Preview" />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                       <div className="absolute bottom-4 left-4 right-4">
                           <div className="text-xs uppercase bg-yellow-500 text-yellow-950 px-2 py-1 inline-block rounded font-black tracking-wider mb-2 shadow-lg">⭐ PATROCINADO</div>
                           <h3 className="font-bold text-lg leading-tight line-clamp-2 text-white">{property.title}</h3>
                       </div>
                   </div>

                   <div className="p-6">
                       <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Wallet size={20}/> Resumo do Pedido</h3>
                       
                       <div className="space-y-3 text-sm border-b border-white/10 pb-4 mb-4">
                           <div className="flex justify-between text-slate-400">
                               <span>Assinatura Trimestral VIP</span>
                               <span>R$ {siteCharge.toFixed(2)}</span>
                           </div>
                       </div>

                       <div className="flex justify-between items-center mb-8">
                           <span className="font-semibold text-lg">Total</span>
                           <span className="text-2xl font-black text-yellow-400">R$ {siteCharge.toFixed(2)}</span>
                       </div>

                       {paypalError && <div className="mb-4 text-sm text-red-400 text-center p-2 bg-red-400/10 rounded-lg">{paypalError}</div>}

                       {isProcessing && (
                           <div className="text-center py-4 text-yellow-400 font-bold animate-pulse">Confirmando transação...</div>
                       )}

                       {!isProcessing && !paypalOrderId && (
                           <button onClick={startPaypalCheckout} className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-900 font-black py-4 px-6 rounded-xl transition shadow-xl shadow-yellow-500/20">
                               Patrocinar Agora
                           </button>
                       )}

                       {!isProcessing && paypalOrderId && (
                          <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "BRL", intent: "capture" }}>
                              <PayPalButtons
                                style={{ layout: "vertical", shape: "rect", label: "pay" }}
                                createOrder={async () => paypalOrderId}
                                onApprove={async (data) => {
                                  setIsProcessing(true);
                                  try {
                                     const res = await fetch("/api/paypal/capture-sponsor-order", {
                                       method: "POST",
                                       headers: { "Content-Type": "application/json" },
                                       body: JSON.stringify({ orderID: data.orderID, propertyId: id }),
                                     });
                                     const result = await res.json();
                                     if (!res.ok || !result.success) throw new Error(result.error);
                                     setSuccessMsg(`Parabéns! O anúncio agora é oficialmente um Imóvel Patrocinado. Você garante prioridade absoluta pelas próximas 12 semanas!`);
                                   } catch (err: any) {
                                     setPaypalError(err.message || `Erro de comunicação financeira.`);
                                  } finally {
                                    setIsProcessing(false);
                                  }
                                }}
                                onCancel={() => { setPaypalError(""); setPaypalOrderId(null); }}
                              />
                          </PayPalScriptProvider>
                       )}
                   </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
