"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type Offer = {
  id: number;
  offerPrice: number;
  status: string;
  createdAt: string;
  contactReleased: boolean;
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

    const res = await fetch("/api/paypal/create-order", {
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

  function closePaypalModal() {
    setPaypalOfferId(null);
    setPaypalOrderId(null);
    setPaypalError("");
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="text-slate-400">Carregando...</div>
      </main>
    );
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

          <h1 className="text-3xl font-bold mt-3">Ofertas do imóvel</h1>

          {property && <div className="text-slate-400 mt-1">{property.title}</div>}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl mb-6 text-red-300">
            {error}
          </div>
        )}

        {offers.length === 0 && (
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl text-slate-400">
            Nenhuma oferta recebida ainda.
          </div>
        )}

        <div className="space-y-4">
          {offers.map((offer, index) => (
            <div
              key={offer.id}
              className="bg-white/5 border border-white/10 p-5 rounded-2xl"
            >
              <div className="flex justify-between items-start gap-6">
                <div>
                  <div className="text-xl font-semibold">
                    R$ {offer.offerPrice.toLocaleString("pt-BR")}
                  </div>

                  <div className="text-sm text-slate-400 mt-1">
                    {new Date(offer.createdAt).toLocaleDateString("pt-BR")}
                  </div>

                  <div className="mt-3 text-sm text-slate-300 space-y-1">
                    <div>
                      👤{" "}
                      {offer.contactReleased
                        ? offer.buyer?.name || "-"
                        : `Comprador ${index + 1}`}
                    </div>

                    {offer.contactReleased ? (
                      <>
                        <div>📧 {offer.buyer?.email || "-"}</div>
                        <div>📱 {offer.buyer?.phone || "-"}</div>
                        <div>📷 {offer.buyer?.instagram || "-"}</div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-blue-200 mt-2">
                        Os dados do comprador serão liberados somente após o pagamento da taxa via PayPal.
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col gap-2">
                  {offer.status === "open" && (
                    <button
                      onClick={() => aceitarOferta(offer.id)}
                      disabled={actionLoadingId === offer.id}
                      className="bg-white text-black px-4 py-2 rounded-xl font-semibold disabled:opacity-60"
                    >
                      {actionLoadingId === offer.id ? "Aceitando..." : "Aceitar proposta"}
                    </button>
                  )}

                  {offer.status === "accepted" && !offer.contactReleased && (
                    <>
                      <div className="text-green-400 font-medium">✔ Aceita</div>
                      <button
                        onClick={() => prepararPaypal(offer.id)}
                        className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold"
                      >
                        Pagar taxa com PayPal
                      </button>
                    </>
                  )}

                  {offer.status === "accepted" && offer.contactReleased && (
                    <>
                      <div className="text-green-400 font-medium">✔ Aceita</div>
                      <div className="text-xs text-emerald-300">
                        Contato liberado
                      </div>
                    </>
                  )}

                  {offer.status === "cancelled" && (
                    <div className="text-slate-500">Cancelada</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {paypalOfferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-400">Pagamento da taxa</div>
                <h2 className="mt-1 text-2xl font-bold">PayPal</h2>
              </div>

              <button
                type="button"
                onClick={closePaypalModal}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-4 text-sm text-blue-200">
              Após a confirmação do pagamento, os dados do comprador serão liberados automaticamente nesta tela.
            </div>

            {paypalError && (
              <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                {paypalError}
              </div>
            )}

            {!paypalOrderId ? (
              <div className="mt-6 text-slate-400">Preparando pagamento...</div>
            ) : (
              <div className="mt-6">
                <PayPalScriptProvider
                  options={{
                    clientId: paypalClientId,
                    currency: "BRL",
                    intent: "capture",
                  }}
                >
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
                      const res = await fetch("/api/paypal/capture-order", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          orderID: data.orderID,
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
                </PayPalScriptProvider>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}