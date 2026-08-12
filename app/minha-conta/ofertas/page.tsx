"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Upload,
  ShieldCheck,
  FileText,
  ChevronRight,
  Ban,
  DollarSign,
  AlertCircle
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";
import { useListingType } from "@/context/ListingTypeContext";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

type PixCheckItem = {
  passed: boolean;
  label: string;
  name?: string | null;
  cpfCnpj?: string | null;
  bank?: string | null;
  date?: string | null;
  debitDate?: string | null;
  code?: string | null;
  transactionType?: string | null;
};

type PixValidation = {
  analyzedAt: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  allPassed: boolean;
  passedCount: number;
  totalChecks: number;
  transactionValue: string | null;
  checks: {
    recipientData: PixCheckItem;
    payerData: PixCheckItem;
    transactionDateTime: PixCheckItem;
    authCode: PixCheckItem;
    isEffective: PixCheckItem;
  };
};

type OfferItem = {
  id: number;
  offerPrice: string | number;
  totalStayPrice?: string | number | null;
  depositAmount?: string | number | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  guests?: number | null;
  pixReceiptUrl?: string | null;
  pixValidation?: PixValidation | null;
  createdAt: string;
  buyer?: {
    id?: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  property?: {
    id: number;
    title?: string;
    city?: string | null;
    state?: string | null;
    neighborhood?: string | null;
    pixKey?: string | null;
    listingType?: string | null;
    images?: { imageUrl: string }[];
    owner?: {
      id?: number;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  };
};

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "sb";

const GUEST_STEPS = [
  {
    num: 1,
    title: "1. Pedido Enviado",
    desc: "Sua solicitação de reserva foi enviada. O anfitrião tem 24h para aceitar.",
    icon: "📩"
  },
  {
    num: 2,
    title: "2. Pagamento do Sinal",
    desc: "Anfitrião aceitou! Os dados de contato e chave Pix do sinal foram liberados.",
    icon: "💳"
  },
  {
    num: 3,
    title: "3. Comprovante Anexado",
    desc: "Você enviou o comprovante Pix do sinal para verificação do anfitrião.",
    icon: "📎"
  },
  {
    num: 4,
    title: "4. Reserva Confirmada!",
    desc: "Sua estadia está 100% garantida e o imóvel bloqueado nas suas datas.",
    icon: "🎉"
  }
];

const HOST_STEPS = [
  {
    num: 1,
    title: "1. Pedido Recebido",
    desc: "Você recebeu um pedido de reserva. Aceite e pague a taxa de 1% (PayPal) em 24h.",
    icon: "📬"
  },
  {
    num: 2,
    title: "2. Aguardando Hóspede",
    desc: "Pedido aceito! O hóspede deve realizar a transferência Pix do sinal estipulado.",
    icon: "⏳"
  },
  {
    num: 3,
    title: "3. Comprovante Recebido",
    desc: "O hóspede anexou o comprovante Pix. Verifique o recebimento do sinal.",
    icon: "🔍"
  },
  {
    num: 4,
    title: "4. Reserva Confirmada!",
    desc: "Estadia confirmada com sucesso! Prepare a recepção para o hóspede.",
    icon: "🏠"
  }
];

const CHECK_FAILURE_HINTS: Record<string, string> = {
  recipientData: "O comprovante não mostra claramente o nome e o banco do destinatário. Certifique-se de enviar o comprovante completo, não apenas o recibo de confirmação de envio.",
  payerData: "O nome ou CPF/CNPJ de quem realizou a transferência não está visível. Envie o comprovante original gerado pelo seu banco.",
  transactionDateTime: "A data e hora da transação não foram identificadas. O comprovante precisa conter a data exata da operação.",
  authCode: "O código de autenticação (E2E ID ou hash) não foi encontrado. Este código fica no rodapé do comprovante oficial do banco.",
  isEffective: "O comprovante parece ser de um agendamento, não de uma transferência efetivada. Envie o comprovante somente após a transferência ser concluída e processada.",
};

function PixValidationPanel({ validation, perspective }: { validation: PixValidation; perspective: "VIAJANDO" | "HOSPEDANDO" }) {
  const checkList = [
    {
      key: "recipientData",
      check: validation.checks.recipientData,
      detail: [validation.checks.recipientData.name, validation.checks.recipientData.cpfCnpj, validation.checks.recipientData.bank].filter(Boolean).join(" • "),
    },
    {
      key: "payerData",
      check: validation.checks.payerData,
      detail: [validation.checks.payerData.name, validation.checks.payerData.cpfCnpj].filter(Boolean).join(" • "),
    },
    {
      key: "transactionDateTime",
      check: validation.checks.transactionDateTime,
      detail: validation.checks.transactionDateTime.date || "",
    },
    {
      key: "authCode",
      check: validation.checks.authCode,
      detail: validation.checks.authCode.code ? `${String(validation.checks.authCode.code).slice(0, 30)}...` : "",
    },
    {
      key: "isEffective",
      check: validation.checks.isEffective,
      detail: validation.checks.isEffective.transactionType || "",
    },
  ] as { key: string; check: PixCheckItem; detail: string }[];

  const failedChecks = checkList.filter(c => !c.check.passed);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-sky-400" />
          Verificação Automática do Comprovante
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          validation.allPassed
            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
            : "bg-amber-500/20 border-amber-500/30 text-amber-300"
        }`}>
          {validation.passedCount}/{validation.totalChecks} aprovados
        </span>
      </div>

      {/* Check rows */}
      {checkList.map(({ key, check, detail }) => (
        <div key={key} className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 border ${
          check.passed
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-red-500/10 border-red-500/20"
        }`}>
          <span className={`mt-0.5 flex-shrink-0 text-sm ${check.passed ? "text-emerald-400" : "text-red-400"}`}>
            {check.passed ? "✅" : "❌"}
          </span>
          <div className="min-w-0 flex-1">
            <div className={`text-xs font-bold ${check.passed ? "text-emerald-300" : "text-red-300"}`}>
              {check.label}
            </div>
            {detail && (
              <div className="text-[11px] text-slate-400 mt-0.5 break-all">{detail}</div>
            )}
            {/* Show hint only in guest view for failed checks */}
            {!check.passed && perspective === "VIAJANDO" && CHECK_FAILURE_HINTS[key] && (
              <div className="mt-1 text-[11px] text-amber-300 leading-relaxed">
                ⚠️ {CHECK_FAILURE_HINTS[key]}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Summary guidance for guest */}
      {perspective === "VIAJANDO" && !validation.allPassed && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 leading-relaxed">
          <strong className="text-amber-300">O que fazer?</strong> Corrija os itens marcados com ❌ e envie um novo comprovante. Certifique-se de usar o comprovante oficial gerado pelo app do seu banco (não capturas de tela parciais ou recibos de agendamento).
        </div>
      )}

      {/* Confirmed message for guest */}
      {perspective === "VIAJANDO" && validation.allPassed && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200 font-bold text-center">
          🎉 Comprovante aprovado automaticamente! Sua reserva foi confirmada.
        </div>
      )}

      {/* Footer: confidence + value */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-slate-500">
          Confiança: <span className={`font-bold ${
            validation.confidence === "HIGH" ? "text-emerald-400" :
            validation.confidence === "MEDIUM" ? "text-amber-400" : "text-red-400"
          }`}>{validation.confidence}</span>
        </span>
        {validation.transactionValue && (
          <span className="text-[11px] font-bold text-emerald-400">
            Valor detectado: R$ {validation.transactionValue}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MinhasReservasPage() {
  const { status } = useSession();
  const router = useRouter();
  const { listingType } = useListingType();

  const [activeTab, setActiveTab] = useState<"VIAJANDO" | "HOSPEDANDO">("VIAJANDO");
  const [guestOffers, setGuestOffers] = useState<OfferItem[]>([]);
  const [hostOffers, setHostOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadingOfferId, setUploadingOfferId] = useState<number | null>(null);
  const [validatingOfferId, setValidatingOfferId] = useState<number | null>(null);
  const [pixValidationResult, setPixValidationResult] = useState<{ offerId: number; validation: PixValidation } | null>(null);

  // PayPal modal state for host acceptance
  const [paypalOfferId, setPaypalOfferId] = useState<number | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const isSeasonal = listingType === "ALUGUEL_TEMPORADA";

  async function loadOffers() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/minha-conta/ofertas");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao carregar ofertas.");
      }

      setGuestOffers(data.guestOffers || data.offers || []);
      setHostOffers(data.hostOffers || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar ofertas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadOffers();
    }
  }, [status]);

  // Guest cancel request
  async function handleCancel(offerId: number) {
    const confirmed = window.confirm(
      isSeasonal ? "Deseja cancelar este pedido de reserva?" : "Deseja cancelar essa oferta?"
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", offer_id: offerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao cancelar oferta.");
      }

      await loadOffers();
    } catch (err: any) {
      alert(err.message || "Erro ao cancelar oferta.");
    }
  }

  // Guest upload Pix receipt
  async function handleUploadPixReceipt(offerId: number, file: File) {
    try {
      setUploadingOfferId(offerId);
      const formData = new FormData();
      formData.append("file", file);

      // Step 1: Upload image
      const uploadRes = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.imageUrl) {
        throw new Error(uploadData.error || "Erro ao fazer upload do comprovante.");
      }

      // Step 2: Save receipt URL to offer
      const saveRes = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_pix",
          offer_id: offerId,
          pix_receipt_url: uploadData.imageUrl,
          skip_confirm: true, // don't auto-confirm, let AI validate
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.error || "Erro ao salvar comprovante Pix.");
      }

      // Step 3: Run AI validation
      setUploadingOfferId(null);
      setValidatingOfferId(offerId);

      const validateRes = await fetch("/api/minha-conta/ofertas/validate-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: offerId,
          image_url: uploadData.imageUrl,
        }),
      });
      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.success) {
        // Validation failed technically — still save, let host review manually
        alert("⚠️ Comprovante enviado. A verificação automática falhou — o anfitrião irá analisar manualmente.");
      } else {
        if (validateData.allPassed) {
          alert("✅ Comprovante validado com sucesso! Sua reserva foi confirmada automaticamente.");
        } else {
          alert(`⚠️ Comprovante enviado. ${validateData.validation?.passedCount || 0} de 5 verificações passaram. O anfitrião irá analisar o comprovante.`);
        }
      }

      await loadOffers();
    } catch (err: any) {
      alert(err?.message || "Erro ao enviar comprovante.");
    } finally {
      setUploadingOfferId(null);
      setValidatingOfferId(null);
    }
  }

  // Host prepare PayPal 1% fee order
  async function prepararPaypalHost(offerId: number) {
    try {
      setPaypalError("");
      setPaypalOfferId(offerId);
      setPaypalOrderId(null);

      const res = await fetch("/api/paypal/create-host-reservation-fee-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offerId }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { success: false, error: raw || "Resposta inválida da API do PayPal." };
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao preparar pagamento PayPal.");
      }

      if (data.already_paid) {
        await loadOffers();
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

  // Host reject offer
  async function recusarOfertaHost(id: number) {
    const confirmReject = window.confirm(
      "Deseja recusar este pedido de reserva? As datas ficarão livres imediatamente."
    );
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
      await loadOffers();
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

  function getStepPhase(offer: OfferItem): number {
    const s = String(offer.status).toUpperCase();
    if (s === "RESERVA_CONFIRMADA" || s === "ACCEPTED" || s === "MATCHED") return 4;
    if (offer.pixReceiptUrl) return 3;
    if (s === "ACCEPTED_WAITING_PAYMENT") return 2;
    if (s === "PENDING_HOST_APPROVAL" || s === "OPEN") return 1;
    return 1;
  }

  if (loading) {
    return (
      <LoadingScreen
        title="Minhas Reservas"
        subtitle="Sincronizando seus pedidos de reserva e estadias..."
      />
    );
  }

  const filteredGuestOffers = guestOffers.filter((o) =>
    isSeasonal
      ? o.property?.listingType === "ALUGUEL_TEMPORADA"
      : o.property?.listingType !== "ALUGUEL_TEMPORADA"
  );

  const filteredHostOffers = hostOffers.filter((o) =>
    isSeasonal
      ? o.property?.listingType === "ALUGUEL_TEMPORADA"
      : o.property?.listingType !== "ALUGUEL_TEMPORADA"
  );

  const activeOffersList = activeTab === "VIAJANDO" ? filteredGuestOffers : filteredHostOffers;
  const currentSteps = activeTab === "VIAJANDO" ? GUEST_STEPS : HOST_STEPS;

  return (
    <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "BRL" }}>
      <main className="min-h-screen bg-slate-950 px-4 py-8 md:px-8 text-white">
        <div className="mx-auto max-w-6xl">

          {/* Header navigation back */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href="/minha-conta"
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white hover:border-sky-500/50 shadow-lg shadow-sky-500/5 group"
            >
              <X size={16} className="rotate-45 group-hover:scale-110 transition-transform" />
              Voltar ao Painel
            </Link>

            <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              {isSeasonal ? "Aluguel Temporada" : "Compra e Venda"}
            </span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Minhas Reservas
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie suas estadias como hóspede viajante ou como anfitrião dos seus imóveis.
            </p>
          </div>

          {/* TOGGLE SWITCH TAB KEY */}
          <div className="flex items-center gap-3 bg-slate-900 border border-white/10 p-1.5 rounded-2xl w-fit mb-8 shadow-xl">
            <button
              onClick={() => setActiveTab("VIAJANDO")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "VIAJANDO"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-base">🧳</span>
              <span>Estou Viajando</span>
              {filteredGuestOffers.length > 0 && (
                <span className="ml-1 rounded-full bg-emerald-400/20 text-emerald-300 text-[10px] px-2 py-0.5 font-bold border border-emerald-400/30">
                  {filteredGuestOffers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("HOSPEDANDO")}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs md:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "HOSPEDANDO"
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-sky-400/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-base">🏠</span>
              <span>Estou Hospedando</span>
              {filteredHostOffers.length > 0 && (
                <span className="ml-1 rounded-full bg-sky-400/20 text-sky-300 text-[10px] px-2 py-0.5 font-bold border border-sky-400/30">
                  {filteredHostOffers.length}
                </span>
              )}
            </button>
          </div>

          {/* WORKFLOW STEPPER PROGRESS ARROW COMPONENT */}
          <div className="mb-8 rounded-3xl border border-white/10 bg-slate-900/90 p-5 md:p-6 backdrop-blur-xl shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                <Sparkles size={16} />
                <span>Fases para Conclusão da Reserva ({activeTab === "VIAJANDO" ? "Perspectiva do Hóspede" : "Perspectiva do Anfitrião"})</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Fluxo em 4 Etapas</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentSteps.map((step) => (
                <div
                  key={step.num}
                  className="relative group flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-4 transition-all hover:border-emerald-500/40"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black border border-emerald-500/30">
                        {step.num}
                      </span>
                      <span className="text-lg">{step.icon}</span>
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white mb-1">{step.title}</h4>
                    <p className="text-[11px] leading-relaxed text-slate-400">{step.desc}</p>
                  </div>
                  {step.num < 4 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                      <ChevronRight size={20} className="text-emerald-500/40" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-red-300">
              {error}
            </div>
          )}

          {/* RESERVATIONS LIST */}
          {activeOffersList.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center text-slate-400 backdrop-blur-md">
              <div className="text-4xl mb-3">{activeTab === "VIAJANDO" ? "🧳" : "🏠"}</div>
              <h3 className="text-lg font-bold text-white mb-1">
                {activeTab === "VIAJANDO" ? "Nenhuma reserva encontrada como viajante." : "Nenhum pedido de reserva recebido para seus imóveis."}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {activeTab === "VIAJANDO"
                  ? "Explore nossos anúncios no mapa da página principal e faça seu primeiro pedido de reserva!"
                  : "Quando hóspedes enviarem pedidos para seus imóveis cadastrados, eles aparecerão aqui."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {activeOffersList.map((offer) => {
                const statusStr = String(offer.status).toUpperCase();
                const isPending = statusStr === "PENDING_HOST_APPROVAL";
                const isAcceptedWaiting = statusStr === "ACCEPTED_WAITING_PAYMENT";
                const isConfirmed = statusStr === "RESERVA_CONFIRMADA" || statusStr === "ACCEPTED" || statusStr === "MATCHED";
                const isRejected = statusStr === "REJECTED";
                const isCancelled = statusStr === "CANCELLED";

                const currentPhase = getStepPhase(offer);

                return (
                  <div
                    key={offer.id}
                    className={`rounded-3xl border border-white/10 bg-slate-900/90 p-5 md:p-6 transition-all shadow-xl backdrop-blur-md ${
                      isCancelled ? "opacity-40 grayscale-[0.5]" : ""
                    }`}
                  >
                    {/* CARD MINI STEPPER PROGRESS ARROW BAR */}
                    {!isCancelled && !isRejected && (
                      <div className="mb-5 border-b border-white/5 pb-4">
                        <div className="flex items-center justify-between gap-1">
                          {currentSteps.map((st) => {
                            const isDone = currentPhase > st.num;
                            const isCurrent = currentPhase === st.num;
                            return (
                              <div key={st.num} className="flex-1 flex flex-col items-center">
                                <div className="flex items-center w-full">
                                  <div
                                    className={`h-1 flex-1 rounded-l ${
                                      st.num === 1
                                        ? "bg-transparent"
                                        : isDone || isCurrent
                                        ? "bg-emerald-500"
                                        : "bg-slate-800"
                                    }`}
                                  />
                                  <div
                                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black border transition-all ${
                                      isCurrent
                                        ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-4 ring-emerald-500/20 font-bold scale-110"
                                        : isDone
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                        : "bg-slate-800 text-slate-500 border-white/10"
                                    }`}
                                  >
                                    {isDone ? "✓" : st.num}
                                  </div>
                                  <div
                                    className={`h-1 flex-1 rounded-r ${
                                      st.num === 4
                                        ? "bg-transparent"
                                        : isDone
                                        ? "bg-emerald-500"
                                        : "bg-slate-800"
                                    }`}
                                  />
                                </div>
                                <span
                                  className={`mt-1 text-[10px] font-bold text-center truncate max-w-[80px] hidden sm:block ${
                                    isCurrent
                                      ? "text-emerald-400"
                                      : isDone
                                      ? "text-slate-400"
                                      : "text-slate-600"
                                  }`}
                                >
                                  {st.title.split(". ")[1]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="h-24 w-32 overflow-hidden rounded-2xl border border-white/10 bg-slate-950 flex-shrink-0">
                          {offer.property?.images?.[0]?.imageUrl ? (
                            <img
                              src={offer.property.images[0].imageUrl}
                              alt={offer.property?.title || "Imóvel"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-500">
                              Sem foto
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className={`text-lg font-bold ${isCancelled ? "text-slate-500" : "text-white"}`}>
                            {offer.property?.title || "Imóvel"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {[
                              offer.property?.neighborhood,
                              offer.property?.city,
                              offer.property?.state,
                            ]
                              .filter(Boolean)
                              .join(" • ") || "-"}
                          </div>

                          {offer.startDate && offer.endDate && (
                            <div className="text-xs text-emerald-400 font-bold flex items-center gap-1 pt-1">
                              📅 {new Date(offer.startDate).toLocaleDateString("pt-BR")} → {new Date(offer.endDate).toLocaleDateString("pt-BR")}
                              <span className="ml-1 text-slate-400 font-normal">({offer.guests || 1} hóspedes)</span>
                            </div>
                          )}

                          <div className="mt-2 text-sm text-slate-300">
                            Valor Total:{" "}
                            <span className={`font-black ${isCancelled ? "text-slate-500 line-through" : "text-emerald-400"}`}>
                              R$ {Number(offer.totalStayPrice || offer.offerPrice).toLocaleString("pt-BR")}
                            </span>
                          </div>

                          {/* Badges de Status */}
                          <div className="pt-2">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                                ⏳ {activeTab === "VIAJANDO" ? "Pedido enviado (Aguardando anfitrião por 24h)" : "Pedido recebido (Aguardando sua aprovação)"}
                              </span>
                            )}

                            {isAcceptedWaiting && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                                ✅ {activeTab === "VIAJANDO" ? "Pedido aceito! Aguardando pagamento do sinal via Pix." : "Pedido aceito por você! Aguardando Pix do hóspede."}
                              </span>
                            )}

                            {isConfirmed && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-400/20 px-3 py-1 text-xs font-black text-emerald-300">
                                🎉 Reserva Confirmada!
                              </span>
                            )}

                            {isRejected && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                                ❌ Pedido recusado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ACTIONS PER PERSPECTIVE */}
                      <div className="flex flex-col gap-2">
                        {offer.property?.id && (
                          <Link
                            href={`/imovel/${offer.property.id}`}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 text-center transition"
                          >
                            Ver anúncio
                          </Link>
                        )}

                        {activeTab === "VIAJANDO" && (isPending || statusStr === "OPEN") && (
                          <button
                            onClick={() => handleCancel(offer.id)}
                            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-400/15 text-center cursor-pointer transition"
                          >
                            Cancelar reserva
                          </button>
                        )}

                        {activeTab === "HOSPEDANDO" && isPending && (
                          <div className="flex flex-col gap-2 mt-1">
                            <button
                              onClick={() => prepararPaypalHost(offer.id)}
                              disabled={actionLoadingId === offer.id}
                              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-black text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 size={14} />
                              Aceitar a reserva
                            </button>
                            <button
                              onClick={() => recusarOfertaHost(offer.id)}
                              disabled={actionLoadingId === offer.id}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 text-center cursor-pointer transition flex items-center justify-center gap-1.5"
                            >
                              <Ban size={14} />
                              Recusar a reserva
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* DETAILS BOX FOR GUEST ("VIAJANDO") */}
                    {activeTab === "VIAJANDO" && (isAcceptedWaiting || isConfirmed) && (
                      <div className="mt-5 border-t border-white/10 pt-4 space-y-3 rounded-2xl bg-slate-950/70 p-4 border border-white/5">
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck size={16} />
                          <span>Dados de Contato e Pagamento do Anfitrião</span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-300">
                          <div><strong>Anfitrião:</strong> {offer.property?.owner?.name || "Não informado"}</div>
                          <div><strong>E-mail:</strong> {offer.property?.owner?.email || "Não informado"}</div>
                          <div><strong>Telefone / WhatsApp:</strong> {offer.property?.owner?.phone || "Não informado"}</div>
                          <div>
                            <strong>Chave Pix:</strong>{" "}
                            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {offer.property?.pixKey || "Consulte o anfitrião"}
                            </span>
                          </div>
                          {offer.depositAmount && (
                            <div className="col-span-full pt-1 text-sm font-extrabold text-emerald-400">
                              Sinal a ser pago via Pix: R$ {Number(offer.depositAmount).toLocaleString("pt-BR")}
                            </div>
                          )}
                        </div>

                        {/* Receipt + Validation for GUEST */}
                        {isAcceptedWaiting && !offer.pixReceiptUrl && (
                          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
                            <span className="text-xs text-amber-300 font-medium">
                              Após realizar o pagamento do sinal via Pix, anexe o comprovante para confirmar a reserva:
                            </span>
                            <label className={`rounded-xl px-4 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                              uploadingOfferId === offer.id || validatingOfferId === offer.id
                                ? "bg-slate-600 cursor-not-allowed shadow-none"
                                : "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20"
                            }`}>
                              <Upload size={14} />
                              {uploadingOfferId === offer.id
                                ? "Enviando..."
                                : validatingOfferId === offer.id
                                ? "⏳ Analisando comprovante..."
                                : "📎 Incluir comprovante Pix"}
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={uploadingOfferId === offer.id || validatingOfferId === offer.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadPixReceipt(offer.id, file);
                                }}
                              />
                            </label>
                          </div>
                        )}

                        {/* After receipt sent — show validation result to guest */}
                        {offer.pixReceiptUrl && (
                          <div className="pt-3 border-t border-white/5 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-slate-300">
                                <FileText size={14} className="text-emerald-400" />
                                <span>Comprovante enviado:</span>
                              </div>
                              <a
                                href={offer.pixReceiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 underline font-bold text-xs"
                              >
                                Ver comprovante
                              </a>
                            </div>

                            {/* Validation analyzing state */}
                            {validatingOfferId === offer.id && (
                              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-300 flex items-center gap-2 animate-pulse">
                                <ShieldCheck size={14} />
                                <span>⏳ Analisando comprovante automaticamente...</span>
                              </div>
                            )}

                            {/* Validation result panel */}
                            {offer.pixValidation && validatingOfferId !== offer.id && (
                              <PixValidationPanel
                                validation={offer.pixValidation}
                                perspective="VIAJANDO"
                              />
                            )}

                            {/* No validation result yet (edge case: API failed) */}
                            {!offer.pixValidation && validatingOfferId !== offer.id && (
                              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
                                <div className="font-bold">⚠️ Verificação automática não foi concluída</div>
                                <div className="text-amber-200 leading-relaxed">Seu comprovante foi recebido, mas a verificação automática não pôde ser processada. O anfitrião irá analisar manualmente. Caso queira, você pode tentar reenviar um comprovante mais legível.</div>
                                {isAcceptedWaiting && (
                                  <label className="mt-2 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 transition cursor-pointer">
                                    <Upload size={13} />
                                    Reenviar comprovante
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      className="hidden"
                                      disabled={uploadingOfferId === offer.id || validatingOfferId === offer.id}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUploadPixReceipt(offer.id, file);
                                      }}
                                    />
                                  </label>
                                )}
                              </div>
                            )}

                            {/* Re-upload button if validation failed */}
                            {offer.pixValidation && !offer.pixValidation.allPassed && isAcceptedWaiting && validatingOfferId !== offer.id && (
                              <label className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-black text-amber-300 hover:bg-amber-500/20 transition cursor-pointer">
                                <Upload size={13} />
                                Reenviar comprovante corrigido
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  disabled={uploadingOfferId === offer.id || validatingOfferId === offer.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadPixReceipt(offer.id, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DETAILS BOX FOR HOST ("HOSPEDANDO") */}
                    {activeTab === "HOSPEDANDO" && isPending && (
                      <div className="mt-5 border-t border-white/10 pt-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                          <Clock size={16} />
                          <span>Etapa 1: Pedido de Reserva Recebido (Prazo: 24h)</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          🔒 <strong>Contato do hóspede bloqueado.</strong> Clique em <strong>"Aceitar a reserva"</strong> acima para efetuar o pagamento da taxa de 1% via PayPal. Após a confirmação, os dados de contato do hóspede serão liberados e o pedido avançará para a <strong>Etapa 2: Aguardando Pagamento do Hóspede</strong>.
                        </p>
                      </div>
                    )}

                    {activeTab === "HOSPEDANDO" && (isAcceptedWaiting || isConfirmed) && (
                      <div className="mt-5 border-t border-white/10 pt-4 space-y-3 rounded-2xl bg-slate-950/70 p-4 border border-white/5">
                        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck size={16} />
                          <span>Dados de Contato do Hóspede (Liberado)</span>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-300">
                          <div><strong>Hóspede:</strong> {offer.buyer?.name || "Não informado"}</div>
                          <div><strong>E-mail:</strong> {offer.buyer?.email || "Não informado"}</div>
                          <div><strong>Telefone / WhatsApp:</strong> {offer.buyer?.phone || "Não informado"}</div>
                          {offer.depositAmount && (
                            <div>
                              <strong>Sinal Pix Solicitado:</strong>{" "}
                              <span className="font-extrabold text-emerald-400">R$ {Number(offer.depositAmount).toLocaleString("pt-BR")}</span>
                            </div>
                          )}
                        </div>

                        {offer.pixReceiptUrl ? (
                          <div className="pt-3 border-t border-white/10 space-y-3">
                            {/* Receipt link */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-slate-300">
                                <FileText size={14} className="text-emerald-400" />
                                <span>Comprovante Pix enviado pelo hóspede:</span>
                              </div>
                              <a
                                href={offer.pixReceiptUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300 font-bold hover:bg-emerald-500/30"
                              >
                                Ver Comprovante
                              </a>
                            </div>

                            {/* AI Validation Panel */}
                            {offer.pixValidation ? (
                              <PixValidationPanel
                                validation={offer.pixValidation}
                                perspective="HOSPEDANDO"
                              />
                            ) : (
                              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center gap-2">
                                <Clock size={13} />
                                <span>Verificação automática em processamento...</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-white/5 text-xs text-amber-300 flex items-center gap-2">
                            <Clock size={14} />
                            <span>Etapa 2: Taxa de 1% paga com sucesso. Aguardando o hóspede enviar o comprovante Pix do sinal.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PAYPAL MODAL FOR HOST 1% FEE PAYMENT */}
        {paypalOfferId && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
            <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase tracking-wider">
                  <DollarSign size={18} />
                  <span>Aceitar Pedido de Reserva</span>
                </div>
                <button
                  onClick={closePaypalModal}
                  className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 text-xs text-slate-300 space-y-2">
                <p>
                  Para aceitar o pedido e liberar os dados do hóspede, efetue o pagamento da taxa administrativa do site (1% do valor total da reserva) via PayPal.
                </p>
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-300 font-bold text-center">
                  Após a confirmação da taxa, o hóspede receberá sua Chave Pix para efetuar o pagamento do sinal da estadia.
                </div>
              </div>

              {paypalError && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  {paypalError}
                </div>
              )}

              {!paypalOrderId ? (
                <div className="mt-6 text-slate-400 text-center text-xs">Conectando ao PayPal...</div>
              ) : (
                <div className="mt-6">
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "paypal" }}
                    createOrder={async () => paypalOrderId}
                    onApprove={async (data) => {
                      const res = await fetch("/api/paypal/capture-host-reservation-fee-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          orderID: data.orderID,
                          offerId: paypalOfferId,
                        }),
                      });

                      const result = await res.json();
                      if (!res.ok || !result.success) {
                        throw new Error(result.error || "Erro ao capturar pagamento.");
                      }

                      alert("🎉 Pedido aceito com sucesso! O hóspede foi notificado para realizar o pagamento do sinal.");
                      closePaypalModal();
                      await loadOffers();
                    }}
                    onError={(err) => {
                      console.error("PAYPAL MODAL ERROR:", err);
                      setPaypalError("Erro ao processar pagamento no PayPal.");
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
    </PayPalScriptProvider>
  );
}