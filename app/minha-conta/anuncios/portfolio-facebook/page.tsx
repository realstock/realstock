"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { Camera } from "lucide-react";

export default function PortfolioFacebookPage() {
  const { status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [service, setService] = useState<any>(null);
  const [error, setError] = useState("");
  
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/minha-conta/anuncios/portfolio-facebook`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar seu portfólio.");
      }

      const propsWithImg = data.properties.filter((p: any) => p.images && p.images.length > 0);
      setProperties(propsWithImg);
      setSelectedIds(propsWithImg.slice(0, 10).map((p: any) => p.id));
      setService(data.service);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar detalhes do portfólio.");
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

      const res = await fetch("/api/paypal/create-portfolio-facebook-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: service.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar pagamento.");
      }

      setPaypalOrderId(data.paypal_order_id);
    } catch (err: any) {
      setPaypalError(err.message || "Erro ao preparar o PayPal.");
    }
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <div className="mx-auto max-w-4xl text-slate-400">Carregando portfólio...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link href="/minha-conta/anuncios" className="text-sm text-slate-400 hover:text-white">
            ← Voltar aos meus anúncios
          </Link>
          <h1 className="mt-4 text-3xl font-bold bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-transparent">
            Publicar Portfólio no Facebook
          </h1>
          <p className="mt-2 text-slate-400">
            Iremos compilar a foto principal dos seus {properties.length} anúncios mais recentes em um Carrossel incrível para o Facebook.
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
              <Link href="/minha-conta/anuncios" className="text-emerald-200 underline">
                Voltar aos anúncios
              </Link>
             </div>
          </div>
        )}

        {!error && !successMsg && properties.length > 0 && service && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-semibold">Fotos selecionadas</h2>
                 <span className="text-sm font-medium px-2 py-1 bg-white/10 rounded-lg">
                    {selectedIds.length} / 10 máx
                 </span>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                 Clique na foto para selecionar ou remover. Apenas as selecionadas irão compor o carrossel.
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
                        className={`aspect-square rounded-xl bg-slate-900 border-2 overflow-hidden relative cursor-pointer transition ${isSelected ? 'border-pink-500' : 'border-transparent opacity-50 hover:opacity-80'} ${isDisabled ? 'cursor-not-allowed grayscale' : ''}`}
                      >
                          <img src={prop.images[0].imageUrl} alt="Capa" className="w-full h-full object-cover" />
                          {isSelected && (
                             <div className="absolute top-1 right-1 bg-pink-500 text-white rounded-full p-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                             </div>
                          )}
                      </div>
                    );
                 })}
              </div>
            </div>

            <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-orange-500/5 p-6 h-fit">
              <h2 className="text-xl font-semibold mb-2">Valor do agrupamento</h2>
              <p className="text-slate-400 text-sm mb-6">
                 Aceite os termos para criarmos a postagem em carrossel usando o PayPal como intermediador.
              </p>

              <div className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                 <div>
                    <div className="font-semibold">{service.name}</div>
                    <div className="text-sm text-slate-400">Serviço digital</div>
                 </div>
                 <div className="text-xl font-bold">
                    R$ {service.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                 </div>
              </div>

              {paypalError && (
                <div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                  {paypalError}
                </div>
              )}

              {isPublishing && (
                  <div className="text-center py-6 text-pink-300 animate-pulse font-semibold">
                      Processando e construindo carrossel, aguarde...
                  </div>
              )}

              {!isPublishing && !paypalOrderId ? (
                <button
                  onClick={startPaypalCheckout}
                  disabled={selectedIds.length === 0}
                  className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 px-6 py-4 text-center font-bold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedIds.length === 0 ? 'Selecione as fotos' : 'Pagar e Postar Portfólio'}
                </button>
              ) : !isPublishing && paypalOrderId ? (
                 <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "BRL", intent: "capture" }}>
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "pay" }}
                    createOrder={async () => paypalOrderId}
                    onApprove={async (data) => {
                      setIsPublishing(true);
                      try {
                        const res = await fetch("/api/paypal/capture-portfolio-facebook-order", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ orderID: data.orderID, selectedPropertyIds: selectedIds }),
                        });
                        const result = await res.json();
                        if (!res.ok || !result.success) throw new Error(result.error);
                        setSuccessMsg("Carrossel de Portfólio postado com sucesso!");
                      } catch (err: any) {
                        setPaypalError(err.message || "Erro interno.");
                      } finally {
                        setIsPublishing(false);
                      }
                    }}
                    onCancel={() => { setPaypalError(""); setPaypalOrderId(null); }}
                  />
                </PayPalScriptProvider>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
