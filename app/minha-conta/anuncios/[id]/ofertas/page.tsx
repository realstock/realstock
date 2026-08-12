"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LoadingScreen from "@/components/LoadingScreen";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type Offer = {
  id: number;
  offerPrice: number;
  status: string;
  createdAt: string;
  contactReleased: boolean;
  startDate?: string | null;
  endDate?: string | null;
  guests?: number | null;
  buyer?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    instagram?: string | null;
  };
};

export default function GerenciarOfertasPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();

  const propertyId = Number(params?.id);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [paypalOfferId, setPaypalOfferId] = useState<number | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/minha-conta/anuncios/${propertyId}/ofertas`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar ofertas.");
      }

      setOffers(data.offers || []);
      setProperty(data.property || null);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar ofertas.");
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
  }, [status, propertyId, router]);

  async function aceitarOferta(id: number) {
    try {
      setActionLoadingId(id);

      const res = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "accept",
          offer_id: id,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao aceitar oferta.");
      }

      await loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao aceitar oferta.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function prepararPaypal(offerId: number) {
    try {
      setPaypalError("");
      setPaypalOfferId(offerId);
      setPaypalOrderId(null);

      const endpoint = property?.listingType === "ALUGUEL_TEMPORADA"
        ? "/api/paypal/create-host-reservation-fee-order"
        : "/api/paypal/create-order";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: offerId,
        }),
      });

      const raw = await res.text();

      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = {
          success: false,
          error: raw || "Resposta inválida da API do PayPal.",
        };
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar pagamento PayPal.");
      }

      if (data.already_paid) {
        await loadData();
        return;
      }

      if (!data.paypal_order_id) {
        throw new Error("A ordem PayPal não foi retornada.");
      }

      setPaypalOrderId(data.paypal_order_id);
    } catch (err: any) {
      setPaypalOfferId(null);
      setPaypalOrderId(null);
      setPaypalError(err.message || "Erro ao preparar pagamento PayPal.");
    }
  }

  async function recusarOferta(id: number) {
    const confirmReject = window.confirm("Deseja recusar este pedido de reserva? As datas serão liberadas imediatamente.");
    if (!confirmReject) return;

    try {
      setActionLoadingId(id);
      const res = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", offer_id: id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao recusar reserva.");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Erro ao recusar reserva.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function closePaypalModal() {
    setPaypalOfferId(null);
    setPaypalOrderId(null);
    setPaypalError("");
  }

  if (status === "loading" || loading) {
    return <LoadingScreen title="Gestão de Ofertas" subtitle="Carregando propostas para este imóvel..." />;
  }

  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/minha-conta/anuncios"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Voltar
          </Link>

          <h1 className="text-3xl font-bold mt-3">
            {property?.listingType === "ALUGUEL_TEMPORADA" ? "Pedidos de Reserva do imóvel" : "Ofertas do imóvel"}
          </h1>

          {property && <div className="text-slate-400 mt-1">{property.title}</div>}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-6 text-red-300">
            {error}
          </div>
        )}

        {property?.contactFeePaidAt && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl mb-6 text-emerald-300 flex items-center gap-3">
             <div className="bg-emerald-500 p-1 rounded-full text-black">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
             </div>
             <div>
                <div className="font-bold">Contatos Liberados</div>
                <div className="text-xs opacity-80">Você já pagou a taxa para este imóvel. Todos os contatos atuais e futuros estão visíveis.</div>
             </div>
          </div>
        )}

        {offers.length === 0 && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl text-slate-400">
            Nenhuma oferta recebida ainda.
          </div>
        )}

        <div className="space-y-4">
          {offers.map((offer, index) => {
            const statusUpper = String(offer.status).toUpperCase();
            const isPendingHost = statusUpper === "PENDING_HOST_APPROVAL";
            const isAcceptedWaiting = statusUpper === "ACCEPTED_WAITING_PAYMENT";
            const isConfirmed = statusUpper === "RESERVA_CONFIRMADA";
            const isRejected = statusUpper === "REJECTED";

            return (
              <div
                key={offer.id}
                className={`bg-white/5 border border-white/10 p-5 rounded-2xl transition-all ${
                  offer.status === "cancelled" || isRejected ? "opacity-40 grayscale-[0.5]" : ""
                }`}
              >
                <div className="flex justify-between items-start gap-6">
                  <div>
                    <div className={`text-xl font-semibold ${offer.status === "cancelled" || isRejected ? "line-through text-slate-500" : ""}`}>
                      {Number(offer.offerPrice) === 0 ? (
                        "Agendar Visita"
                      ) : offer.startDate && offer.endDate ? (
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-black">Solicitação de Reserva</span>
                          <span className="text-sm text-slate-300 font-medium mt-0.5">
                            Período: {new Date(offer.startDate).toLocaleDateString("pt-BR")} a {new Date(offer.endDate).toLocaleDateString("pt-BR")}
                            {offer.guests && ` • Hóspedes: ${offer.guests}`}
                          </span>
                          <span className="text-slate-400 font-normal text-xs mt-1">
                            Valor total da estadia: <span className="font-bold text-white">R$ {Number(offer.offerPrice).toLocaleString("pt-BR")}</span>
                          </span>
                        </div>
                      ) : (
                        `R$ ${offer.offerPrice.toLocaleString("pt-BR")}`
                      )}
                    </div>

                    <div className="text-sm text-slate-400 mt-1">
                      Enviado em {new Date(offer.createdAt).toLocaleDateString("pt-BR")} 
                    </div>

                    <div className="mt-3 text-sm text-slate-300 space-y-1">
                      <div>
                        👤{" "}
                        {offer.contactReleased
                          ? offer.buyer?.name || "-"
                          : property?.listingType === "ALUGUEL_TEMPORADA"
                          ? `Hóspede ${index + 1}`
                          : `Comprador ${index + 1}`}
                      </div>

                      {offer.contactReleased ? (
                        <>
                          <div>📧 {offer.buyer?.email || "-"}</div>
                          <div>📱 {offer.buyer?.phone || "-"}</div>
                          <div>📷 {offer.buyer?.instagram || "-"}</div>
                        </>
                      ) : (
                        <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-blue-200 mt-2 text-xs">
                          {property?.listingType === "ALUGUEL_TEMPORADA"
                            ? "Os dados do hóspede serão liberados assim que você aceitar o pedido pagando a taxa de 1% no PayPal."
                            : "Os dados do comprador serão liberados após a taxa ser paga."}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col gap-2">
                    {(isPendingHost || offer.status === "open") && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => prepararPaypal(offer.id)}
                          disabled={actionLoadingId === offer.id}
                          className="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl font-extrabold hover:bg-emerald-400 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                        >
                          {actionLoadingId === offer.id
                            ? "Processando..."
                            : property?.listingType === "ALUGUEL_TEMPORADA"
                            ? "Aceitar pedido (Pagar taxa 1% PayPal)"
                            : "Aceitar proposta"}
                        </button>

                        <button
                          onClick={() => recusarOferta(offer.id)}
                          disabled={actionLoadingId === offer.id}
                          className="border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-500/20 transition cursor-pointer"
                        >
                          Recusar reserva
                        </button>
                      </div>
                    )}

                    {isAcceptedWaiting && (
                      <div className="text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl">
                        ✔ Aceito por você! Aguardando comprovante Pix do hóspede.
                      </div>
                    )}

                    {isConfirmed && (
                      <div className="text-emerald-300 font-black text-xs bg-emerald-400/20 border border-emerald-400/40 px-3 py-2 rounded-xl">
                        🎉 Reserva Confirmada!
                      </div>
                    )}

                    {isRejected && (
                      <div className="text-red-400 font-medium text-xs">
                        ❌ Reserva Recusada
                      </div>
                    )}

                    {offer.status === "cancelled" && (
                      <div className="text-slate-500 text-xs">Cancelada pelo hóspede</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {paypalOfferId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div>
                <h3 className="font-bold text-lg">Pagar Taxa de Aceite</h3>
                <p className="text-xs text-slate-400">1% do valor total da estadia via PayPal</p>
              </div>

              <button
                type="button"
                onClick={closePaypalModal}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-xs text-blue-200 space-y-2 leading-relaxed">
              <p>
                Após a aprovação do pagamento da taxa de 1%, os dados de contato do hóspede serão liberados e o hóspede receberá sua chave Pix para pagamento do sinal.
              </p>
            </div>

            {paypalError && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                {paypalError}
              </div>
            )}

            {!paypalOrderId ? (
              <div className="mt-6 text-slate-400 text-center">Preparando checkout PayPal...</div>
            ) : (
              <div className="mt-6">
                <PayPalButtons
                  style={{
                    layout: "vertical",
                    shape: "rect",
                    label: "paypal",
                  }}
                  createOrder={async () => {
                    return paypalOrderId;
                  }}
                  onApprove={async (data) => {
                    const endpoint = property?.listingType === "ALUGUEL_TEMPORADA"
                      ? "/api/paypal/capture-host-reservation-fee-order"
                      : "/api/paypal/capture-order";

                    const res = await fetch(endpoint, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        orderID: data.orderID,
                        offerId: paypalOfferId,
                      }),
                    });

                    const result = await res.json();

                    if (!res.ok || !result.success) {
                      throw new Error(
                        result.error || "Erro ao capturar pagamento."
                      );
                    }

                    closePaypalModal();
                    await loadData();
                  }}
                  onError={(err) => {
                    console.error("PAYPAL MODAL ERROR:", err);
                    setPaypalError("Erro ao processar pagamento PayPal.");
                  }}
                  onCancel={() => {
                    setPaypalError("Pagamento cancelado.");
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}