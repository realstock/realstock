"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: any;
  }
}

export default function SellerPayPalCheckout({
  offerId,
  amount,
  onPaid,
}: {
  offerId: number;
  amount: string;
  onPaid: () => void;
}) {
  const paypalRef = useRef<HTMLDivElement | null>(null);
  const buttonsInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Valor inválido para checkout PayPal.");
      return;
    }

    const renderButtons = async () => {
      if (cancelled || !paypalRef.current) return;
      if (initializedRef.current) return;

      if (!window.paypal || !window.paypal.Buttons) {
        attempts += 1;

        if (attempts > 20) {
          setError("SDK do PayPal não carregou.");
          return;
        }

        setTimeout(renderButtons, 300);
        return;
      }

      try {
        initializedRef.current = true;
        setError("");

        if (paypalRef.current) {
          paypalRef.current.innerHTML = "";
        }

        const buttons = window.paypal.Buttons({
          style: {
            layout: "vertical",
            shape: "rect",
            label: "paypal",
            tagline: false,
          },

          createOrder: async () => {
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ offer_id: Number(offerId) }),
            });

            const data = await res.json();

            if (!res.ok || !data.success || !data.paypal_order_id) {
              throw new Error(
                data.error ||
                  data.detail?.message ||
                  "Erro ao criar ordem PayPal."
              );
            }

            return String(data.paypal_order_id);
          },

          onApprove: async (data: any) => {
            try {
              const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  paypal_order_id: data.orderID,
                }),
              });

              const result = await res.json();

              if (!res.ok || !result.success) {
                throw new Error(
                  result.error ||
                    result.detail?.message ||
                    "Erro ao confirmar pagamento."
                );
              }

              onPaid();
            } catch (err: any) {
              console.error("Erro no onApprove:", err);
              setError("Pagamento processado. Atualizando status...");
              setTimeout(() => {
                onPaid();
              }, 1200);
            }
          },

          onError: (err: any) => {
            console.error("PayPal onError:", err);
            setError("Erro no checkout PayPal.");
          },
        });

        buttonsInstanceRef.current = buttons;
        await buttons.render(paypalRef.current);
      } catch (err: any) {
        console.error("Erro ao renderizar checkout:", err);
        initializedRef.current = false;

        if (!cancelled) {
          setError(err?.message || "Erro ao iniciar checkout PayPal.");
        }
      }
    };

    renderButtons();

    return () => {
      cancelled = true;

      try {
        if (buttonsInstanceRef.current?.close) {
          buttonsInstanceRef.current.close();
        }
      } catch {}

      buttonsInstanceRef.current = null;
      initializedRef.current = false;

      if (paypalRef.current) {
        paypalRef.current.innerHTML = "";
      }
    };
  }, [offerId, amount, onPaid]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
        Valor da taxa:{" "}
        <span className="font-semibold text-emerald-400">R$ {amount}</span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div ref={paypalRef} />
    </div>
  );
}