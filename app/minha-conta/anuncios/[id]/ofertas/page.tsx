"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import SellerPayPalCheckout from "@/components/SellerPayPalCheckout";

function getInitials(name?: string) {
  if (!name) return "Comprador";

  const parts = name.split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0][0].toUpperCase() + ".";
  }

  return parts.map((p) => p[0].toUpperCase() + ".").join(" ");
}

export default function GerenciarOfertasPage() {
  const params = useParams();
  const propertyId = Number(params.id);

  const [user, setUser] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [buyerContacts, setBuyerContacts] = useState<Record<number, any>>({});
  const [openCheckoutForOfferId, setOpenCheckoutForOfferId] = useState<number | null>(null);

  async function loadData(userId: number) {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`/api/minha-conta/anuncios?owner_id=${userId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Não foi possível carregar os anúncios.");
      }

      const foundProperty = (data.properties || []).find(
        (item: any) => item.id === propertyId
      );

      if (!foundProperty) {
        throw new Error("Anúncio não encontrado.");
      }

      setProperty(foundProperty);
      setPayments(data.payments || []);
    } catch (err: any) {
      console.error("LOAD DATA ERROR:", err);
      setError(err.message || "Erro ao carregar ofertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem("realstock_user");

    if (!stored) {
      window.location.href = "/login";
      return;
    }

    const parsed = JSON.parse(stored);
    setUser(parsed);
    loadData(Number(parsed.id));
  }, [propertyId]);

  const paymentMap = useMemo(() => {
    const map: Record<number, any> = {};
    for (const payment of payments) {
      map[payment.offerId] = payment;
    }
    return map;
  }, [payments]);

  async function handleAcceptOffer(offerId: number) {
    setMessage("");
    setError("");
    setOpenCheckoutForOfferId(null);

    try {
      const res = await fetch("/api/minha-conta/ofertas/aceitar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          offer_id: Number(offerId),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao aceitar proposta.");
      }

      setMessage("Proposta aceita com sucesso.");
      await loadData(Number(user.id));
    } catch (err: any) {
      console.error("ACCEPT OFFER ERROR:", err);
      setError(err.message || "Erro ao aceitar proposta.");
    }
  }

  async function handleLoadBuyerContact(paymentId: number) {
    setMessage("");
    setError("");

    try {
      const res = await fetch(
        `/api/minha-conta/comprador-liberado?payment_id=${paymentId}&seller_id=${Number(
          user.id
        )}`
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar contato do comprador.");
      }

      setBuyerContacts((prev) => ({
        ...prev,
        [paymentId]: data.buyer,
      }));
    } catch (err: any) {
      console.error("LOAD BUYER CONTACT ERROR:", err);
      setError(err.message || "Erro ao carregar contato do comprador.");
    }
  }

  function renderOfferAction(offer: any, payment: any) {
    const status = String(offer.status || "").toLowerCase();
    const isPaid = payment?.paymentStatus === "paid";

    if (status === "open") {
      return (
        <button
          onClick={() => handleAcceptOffer(Number(offer.id))}
          className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
        >
          Aceitar proposta
        </button>
      );
    }

    if (status === "cancelled") {
      return (
        <div className="rounded-2xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-slate-400">
          Proposta cancelada
        </div>
      );
    }

    if (status === "accepted" && isPaid && payment) {
      return (
        <button
          onClick={() => handleLoadBuyerContact(payment.id)}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white"
        >
          Ver contato do comprador
        </button>
      );
    }

    if (status === "accepted") {
      return (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
          Proposta aceita
        </div>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="text-slate-400">Carregando ofertas...</div>
        </section>
      </main>
    );
  }

  if (!property) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-6 text-red-300">
            {error || "Anúncio não encontrado."}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-400">Minha conta</div>
            <h1 className="mt-2 text-4xl font-bold">Gerenciar ofertas</h1>
            <p className="mt-2 text-slate-400">{property.title}</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/minha-conta/anuncios"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            >
              Voltar
            </Link>

            <Link
              href={`/imovel/${property.id}`}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
            >
              Ver anúncio
            </Link>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-6">
          <div className="grid gap-6 lg:grid-cols-[220px_1fr_auto]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
              {property.images?.[0]?.imageUrl ? (
                <img
                  src={property.images[0].imageUrl}
                  alt={property.title}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center text-slate-500">
                  Sem foto
                </div>
              )}
            </div>

            <div>
              <h2 className="text-2xl font-bold">{property.title}</h2>
              <p className="mt-2 text-slate-400">
                {[property.neighborhood, property.city, property.state]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>

            <div className="text-right">
              <div className="text-sm text-slate-400">Valor anunciado</div>
              <div className="text-2xl font-bold text-emerald-400">
                R$ {Number(property.price).toLocaleString("pt-BR")}
              </div>
            </div>
          </div>
        </div>

        {property.offers?.length === 0 ? (
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-slate-400">
            Ainda não há ofertas para este anúncio.
          </div>
        ) : (
          <div className="space-y-4">
            {property.offers.map((offer: any) => {
              const payment = paymentMap[offer.id];
              const buyerContact = payment ? buyerContacts[payment.id] : null;

              const checkoutAmount =
                payment?.paymentAmount != null
                  ? Number(payment.paymentAmount).toFixed(2)
                  : (Number(offer.offerPrice) / 5000).toFixed(2);

              const isPaid = payment?.paymentStatus === "paid";
              const status = String(offer.status || "").toLowerCase();

              return (
                <div
                  key={offer.id}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">
                        {getInitials(offer.buyer?.name)}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">
                        Status da oferta: {offer.status}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-slate-400">Valor ofertado</div>
                      <div className="text-2xl font-bold text-emerald-400">
                        R$ {Number(offer.offerPrice).toLocaleString("pt-BR")}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {renderOfferAction(offer, payment)}

                    {status === "accepted" && !isPaid && (
                      <button
                        onClick={() =>
                          setOpenCheckoutForOfferId((current) =>
                            current === Number(offer.id) ? null : Number(offer.id)
                          )
                        }
                        className="rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-sm font-semibold text-blue-200"
                      >
                        {openCheckoutForOfferId === Number(offer.id)
                          ? "Fechar cobrança PayPal"
                          : "Abrir cobrança PayPal"}
                      </button>
                    )}
                  </div>

                  {status === "accepted" &&
                    !isPaid &&
                    openCheckoutForOfferId === Number(offer.id) &&
                    Number.isFinite(Number(checkoutAmount)) &&
                    Number(checkoutAmount) > 0 && (
                      <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-400/10 p-5">
                        <div className="mb-3 text-sm font-medium text-blue-200">
                          Proposta aceita. Efetue o pagamento da taxa via PayPal
                          para liberar o contato do comprador.
                        </div>

                        <SellerPayPalCheckout
                          key={`paypal-offer-${offer.id}-${checkoutAmount}`}
                          offerId={Number(offer.id)}
                          amount={checkoutAmount}
                          onPaid={() => {
                            setOpenCheckoutForOfferId(null);
                            loadData(Number(user.id));
                          }}
                        />
                      </div>
                    )}

                  {payment && (
                    <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                      <div>
                        Status do pagamento:{" "}
                        <span className="font-semibold">
                          {payment.paymentStatus}
                        </span>
                      </div>
                      <div className="mt-1">
                        Valor da cobrança:{" "}
                        <span className="font-semibold text-emerald-400">
                          R$ {Number(payment.paymentAmount).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  )}

                  {buyerContact && (
                    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
                      <div className="font-semibold">
                        Contato do comprador liberado
                      </div>
                      <div className="mt-2">Nome: {buyerContact.name || "-"}</div>
                      <div>Email: {buyerContact.email || "-"}</div>
                      <div>Telefone: {buyerContact.phone || "-"}</div>
                      <div>Instagram: {buyerContact.instagram || "-"}</div>
                      <div>CPF/CNPJ: {buyerContact.cpfCnpj || "-"}</div>
                      <div>PayPal: {buyerContact.paypalEmail || "-"}</div>
                      <div>
                        Localização:{" "}
                        {[buyerContact.city, buyerContact.state, buyerContact.country]
                          .filter(Boolean)
                          .join(" • ") || "-"}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}