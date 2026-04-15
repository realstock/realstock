"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Rocket, Target, CalendarDays, Wallet } from "lucide-react";

export default function TurbinarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform") || "instagram";

  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  const [permalink, setPermalink] = useState<string | null>(null);
  
  // Slider state
  const [dailyBudget, setDailyBudget] = useState<number>(20); // Default R$ 20/day
  const DURATION_DAYS = 5;
  const totalInvestment = dailyBudget * DURATION_DAYS;
  
  let feeAmount = 0;
  if (service?.fee) {
     if (service.fee.type === "PERCENTAGE") {
         feeAmount = (totalInvestment * Number(service.fee.value)) / 100;
     } else {
         feeAmount = Number(service.fee.value);
     }
  }
  const siteCharge = totalInvestment + feeAmount;

  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isBoosting, setIsBoosting] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/minha-conta/anuncios/${id}/turbinar`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar detalhes do anúncio.");
      }

      setProperty(data.property);
      setService(data.service);
      setPermalink(data.permalink);
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

      const res = await fetch("/api/paypal/create-boost-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property_id: id, total_charge: siteCharge, daily_budget: dailyBudget, platform }),
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
    return <main className="min-h-screen bg-slate-950 px-6 py-8 text-white"><div className="mx-auto max-w-4xl text-slate-400">Carregando painel de tráfego...</div></main>;
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
            <h1 className="mt-4 text-3xl font-bold flex items-center gap-2 text-indigo-400">
               <Rocket size={32} />
               Turbinar Anúncio no {platform === "facebook" ? "Facebook" : platform === "google" ? "Google Search/Display" : "Instagram"}
            </h1>
            <p className="mt-2 text-slate-400">
              {platform === "google" 
                ? "Ative uma campanha inteligente no Google Ads para buscar compradores ativos pesquisando na sua região." 
                : "Transforme sua postagem recém-criada em um verdadeiro ímã de leads pela Meta Ads."}
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="mb-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-emerald-300">
            <h3 className="font-bold text-xl mb-2">Campanha no ar! 🎉</h3>
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
            {/* Lado Esquerdo: Detalhes e Configuração */}
            <div className="lg:col-span-7 space-y-6">
               <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
                   <h2 className="text-lg font-bold">Objetivo e Segmentação (Automático)</h2>
                   
                   <div className="grid grid-cols-2 gap-4">
                       <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                           <Target className="text-blue-400" size={24}/>
                           <div>
                              <div className="text-xs text-slate-400 font-semibold uppercase">Público Foco</div>
                              <div className="font-bold">{property.state || "Brasil"}</div>
                              <div className="text-xs text-slate-500 mt-1">Geolocalização garantida pro Estado</div>
                           </div>
                       </div>
                       <div className="bg-slate-900 border border-white/5 p-4 rounded-xl flex items-start gap-3">
                           <CalendarDays className="text-purple-400" size={24}/>
                           <div>
                              <div className="text-xs text-slate-400 font-semibold uppercase">Duração</div>
                              <div className="font-bold">{DURATION_DAYS} Dias corridos</div>
                              <div className="text-xs text-slate-500 mt-1">Campanha de tráfego contínuo</div>
                           </div>
                       </div>
                   </div>
               </div>

               <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 p-6">
                   <h2 className="text-xl font-bold mb-1">Qual o orçamento diário do anúncio?</h2>
                   <p className="text-sm text-slate-400 mb-8">Arraste a barra para definir quanto investir na plataforma {platform === 'google' ? 'Google' : 'Meta'} por dia.</p>
                   
                   <div className="mb-4 flex justify-between items-end">
                       <span className="text-sm font-bold text-slate-500">R$ 10</span>
                       <div className="text-center">
                           <span className="text-3xl font-black text-indigo-400">R$ {dailyBudget}</span>
                           <span className="text-sm text-slate-400">/dia</span>
                       </div>
                       <span className="text-sm font-bold text-slate-500">R$ 150</span>
                   </div>

                   <input 
                      type="range" 
                      min="10" 
                      max="150" 
                      step="5"
                      value={dailyBudget}
                      onChange={(e) => {
                          setDailyBudget(Number(e.target.value));
                          setPaypalOrderId(null); // Reseta o paypal pre-gerado caso o valor mude
                      }}
                      className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                   />
               </div>
            </div>

            {/* Lado Direito: Resumo e Pagamento */}
            <div className="lg:col-span-5 h-fit sticky top-8">
               <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
                   {/* Preview simples do post */}
                   <div className="aspect-[4/3] w-full bg-slate-800 relative">
                       {property.images?.[0]?.imageUrl && (
                           <img src={property.images[0].imageUrl} className="w-full h-full object-cover opacity-60" alt="Preview" />
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                       <div className="absolute bottom-4 left-4 right-4">
                           <div className="text-xs uppercase bg-white/20 px-2 py-1 inline-block rounded text-white font-bold tracking-wider mb-2 backdrop-blur-sm shadow">Preview Patrocinado</div>
                           <h3 className="font-bold text-lg leading-tight line-clamp-2">{property.title}</h3>
                           {permalink && (
                                <a href={permalink} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200 underline">
                                    Ver post que será turbinado
                                </a>
                            )}
                       </div>
                   </div>

                   <div className="p-6">
                       <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Wallet size={20}/> Resumo Financeiro</h3>
                       
                       <div className="space-y-3 text-sm border-b border-white/10 pb-4 mb-4">
                           <div className="flex justify-between text-slate-400">
                               <span>Orçamento (R$ {dailyBudget} x {DURATION_DAYS} dias)</span>
                               <span>R$ {totalInvestment.toFixed(2)}</span>
                           </div>
                           <div className="flex justify-between text-slate-400">
                               <span>Taxa de Agenciamento RealStock {service?.fee?.type === 'PERCENTAGE' ? `(${service.fee.value}%)` : ''}</span>
                               <span>R$ {feeAmount.toFixed(2)}</span>
                           </div>
                       </div>

                       <div className="flex justify-between items-center mb-8">
                           <span className="font-semibold text-lg">Total a pagar</span>
                           <span className="text-2xl font-black text-white">R$ {siteCharge.toFixed(2)}</span>
                       </div>

                       {paypalError && <div className="mb-4 text-sm text-red-400 text-center p-2 bg-red-400/10 rounded-lg">{paypalError}</div>}

                       {isBoosting && (
                           <div className="text-center py-4 text-indigo-400 font-bold animate-pulse">Integração {platform === 'google' ? 'Google Ads' : 'Facebook Ads'} processando...</div>
                       )}

                       {!isBoosting && !paypalOrderId && (
                           <button onClick={startPaypalCheckout} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold py-4 px-6 rounded-xl transition shadow-lg shadow-indigo-500/20">
                               Ir para Pagamento
                           </button>
                       )}

                       {!isBoosting && paypalOrderId && (
                          <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "BRL", intent: "capture" }}>
                              <PayPalButtons
                                style={{ layout: "vertical", shape: "rect", label: "pay" }}
                                createOrder={async () => paypalOrderId}
                                onApprove={async (data) => {
                                  setIsBoosting(true);
                                  try {
                                     const captureUrl = platform === "google" 
                                        ? "/api/paypal/capture-google-order" 
                                        : "/api/paypal/capture-boost-order";
                                        
                                     const res = await fetch(captureUrl, {
                                       method: "POST",
                                       headers: { "Content-Type": "application/json" },
                                       body: JSON.stringify({ orderID: data.orderID, propertyId: id, dailyBudget, platform }),
                                     });
                                     const result = await res.json();
                                     if (!res.ok || !result.success) throw new Error(result.error);
                                     setSuccessMsg(`Sua campanha foi criada com sucesso e está em análise pelo ${platform === 'google' ? 'Google' : 'Meta'}. Logo seus leads começarão a chegar!`);
                                   } catch (err: any) {
                                     setPaypalError(err.message || `Erro na integração com ${platform === 'google' ? 'Google' : 'Meta'}.`);
                                  } finally {
                                    setIsBoosting(false);
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
