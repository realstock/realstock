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
  AlertCircle,
  Star,
  QrCode
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
  amount?: number | null;
  accumulatedPaidAmount?: number | null;
  expected?: number | null;
  remaining?: number | null;
  isPartial?: boolean;
};

type PixValidation = {
  analyzedAt: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  allPassed: boolean;
  passedCount: number;
  totalChecks: number;
  transactionValue: string | null;
  receiptUrls?: string[];
  receiptHistory?: Array<{ url: string; amount: number; authCode?: string | null; date?: string | null }>;
  checks: {
    recipientData: PixCheckItem;
    payerData?: PixCheckItem;
    transactionDateTime: PixCheckItem;
    authCode: PixCheckItem;
    isEffective: PixCheckItem;
    depositValue?: PixCheckItem;
  };
};

function getWhatsAppUrl(phoneStr: string | null | undefined) {
  if (!phoneStr) return null;
  const digits = phoneStr.replace(/\D/g, "");
  if (!digits) return null;
  const fullPhone = digits.length >= 10 && !digits.startsWith("55") ? `55${digits}` : digits;
  return `https://wa.me/${fullPhone}`;
}

type OfferItem = {
  id: number;
  propertyId: number;
  buyerId: number;
  offerPrice: number;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  guests?: number | null;
  depositAmount?: number | null;
  totalStayPrice?: number | null;
  hostFeePaidAt?: string | null;
  pixReceiptUrl?: string | null;
  pixValidation?: PixValidation | null;
  checkInReleasedAt?: string | null;
  remainingBalanceReceiptUrl?: string | null;
  remainingBalanceValidation?: PixValidation | null;
  guestRating?: number | null;
  hostRating?: number | null;
  conversationId?: number | null;
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
    street?: string | null;
    neighborhood?: string | null;
    addressNumber?: string | null;
    zipCode?: string | null;
    pixKey?: string | null;
    pixQrCodeUrl?: string | null;
    googleMapsLink?: string | null;
    listingType?: string | null;
    checkInInstructions?: string | null;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    depositPercentage?: number | null;
    images?: { imageUrl: string }[];
    owner?: {
      id?: number;
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    };
  };
};

function getOfferReceiptUrls(offer: OfferItem): string[] {
  const urls: string[] = [];
  if (Array.isArray(offer.pixValidation?.receiptUrls) && offer.pixValidation.receiptUrls.length > 0) {
    for (const url of offer.pixValidation.receiptUrls) {
      if (typeof url === "string" && url.trim() && !urls.includes(url.trim())) {
        urls.push(url.trim());
      }
    }
  }
  if (offer.pixReceiptUrl && !urls.includes(offer.pixReceiptUrl.trim())) {
    urls.push(offer.pixReceiptUrl.trim());
  }
  return urls;
}

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
    title: "3. Comprovante do Sinal",
    desc: "Você enviou o comprovante Pix do sinal para verificação.",
    icon: "📎"
  },
  {
    num: 4,
    title: "4. Reserva Confirmada",
    desc: "Sinal quitado! Quite o saldo restante da estadia antes do check-in.",
    icon: "🎉"
  },
  {
    num: 5,
    title: "5. Check-in Liberado!",
    desc: "Saldo restante quitado! Chaves, Wi-Fi e endereço completo liberados.",
    icon: "🔑"
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
    title: "2. Aguardando Sinal",
    desc: "Pedido aceito! O hóspede deve realizar a transferência Pix do sinal.",
    icon: "⏳"
  },
  {
    num: 3,
    title: "3. Comprovante do Sinal",
    desc: "O hóspede anexou o comprovante Pix do sinal. Verifique o recebimento.",
    icon: "🔍"
  },
  {
    num: 4,
    title: "4. Reserva Confirmada",
    desc: "Sinal quitado! O hóspede deverá quitar o saldo restante antes do check-in.",
    icon: "🏠"
  },
  {
    num: 5,
    title: "5. Check-in Liberado!",
    desc: "Estadia 100% quitada! Instruções de entrada e chaves liberadas.",
    icon: "🔑"
  }
];

const CHECK_FAILURE_HINTS: Record<string, string> = {
  recipientData: "O comprovante não mostra claramente o nome e o banco do destinatário. Certifique-se de enviar o comprovante completo, não apenas o recibo de confirmação de envio.",
  payerData: "O nome ou CPF/CNPJ de quem realizou a transferência não está visível. Envie o comprovante original gerado pelo seu banco.",
  transactionDateTime: "A data da transação é anterior ao pedido de reserva ou não foi identificada. O comprovante precisa ser da transação atual.",
  authCode: "O código de autenticação (E2E ID) já foi utilizado em outro comprovante ou não foi encontrado. Cada transferência possui um código único.",
  isEffective: "O comprovante parece ser de um agendamento, não de uma transferência efetivada. Envie o comprovante somente após a transferência ser concluída e processada.",
  depositValue: "O valor transferido no comprovante não corresponde ao valor do sinal exigido. O valor pago deve ser exatamente o valor do sinal da reserva.",
};

function PixValidationPanel({
  validation,
  perspective,
  receiptUrls,
}: {
  validation: PixValidation;
  perspective: "VIAJANDO" | "HOSPEDANDO";
  receiptUrls?: string[];
}) {
  const [showDetails, setShowDetails] = useState(!validation.allPassed);

  const checkList = [
    {
      key: "recipientData",
      check: validation.checks.recipientData,
      detail: [validation.checks.recipientData?.name, validation.checks.recipientData?.cpfCnpj, validation.checks.recipientData?.bank].filter(Boolean).join(" • "),
    },
    {
      key: "transactionDateTime",
      check: validation.checks.transactionDateTime,
      detail: validation.checks.transactionDateTime?.date || "",
    },
    {
      key: "authCode",
      check: validation.checks.authCode,
      detail: validation.checks.authCode?.code ? `${String(validation.checks.authCode.code).slice(0, 30)}...` : "",
    },
    {
      key: "isEffective",
      check: validation.checks.isEffective,
      detail: validation.checks.isEffective?.transactionType || "",
    },
  ].filter((item) => !!item.check) as { key: string; check: PixCheckItem; detail: string }[];

  if (validation.checks.depositValue) {
    checkList.push({
      key: "depositValue",
      check: validation.checks.depositValue,
      detail: validation.checks.depositValue.amount
        ? `Pago: R$ ${validation.checks.depositValue.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        : "",
    });
  }

  const failedChecks = checkList.filter(c => !c.check.passed);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3.5 space-y-2">
      {/* Compact Header Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className={validation.allPassed ? "text-emerald-400" : "text-amber-400"} />
          <span className="text-xs font-bold text-slate-200">
            {validation.allPassed
              ? "✅ Verificação Automática do Comprovante (5/5 Aprovados)"
              : `⚠️ Verificação Automática (${validation.passedCount}/${validation.totalChecks} Aprovados)`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-[11px] font-bold text-sky-400 hover:underline"
        >
          {showDetails ? "Ocultar Detalhes ▲" : "Ver Detalhes ▼"}
        </button>
      </div>

      {/* Expanded Grid */}
      {showDetails && (
        <div className="pt-2 border-t border-white/10 space-y-3">
          {/* Receipt Links inside Ver Detalhes */}
          {receiptUrls && receiptUrls.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <FileText size={13} className="text-emerald-400" />
                <span>
                  {receiptUrls.length > 1
                    ? `Comprovantes enviados (${receiptUrls.length}):`
                    : "Comprovante enviado:"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {receiptUrls.map((url, idx) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-300 font-bold hover:bg-emerald-500/30 transition flex items-center gap-1"
                  >
                    <FileText size={12} />
                    <span>Comprovante #{idx + 1}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            {checkList.map(({ key, check, detail }) => (
              <div
                key={key}
                className={`flex flex-col justify-between rounded-lg p-2.5 border text-xs transition-all ${
                  check.passed
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20"
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`font-bold text-[10px] leading-tight ${check.passed ? "text-emerald-300" : "text-red-300"}`}>
                      {check.label}
                    </span>
                    <span className="text-xs shrink-0">{check.passed ? "✅" : "❌"}</span>
                  </div>
                  {detail && (
                    <p className="text-[10px] text-slate-300 font-medium truncate pt-0.5">
                      {detail}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* 6th Slot: Receipt Sum Card */}
            <div className="flex flex-col justify-between rounded-lg p-2.5 border text-xs bg-slate-900 border-emerald-500/30 text-slate-200">
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-[10px] leading-tight text-emerald-300">🧮 Soma Comprovantes</span>
                <span className="text-[9px] text-emerald-400 font-extrabold">
                  {validation.checks.depositValue?.isPartial ? "⚠️ Parcial" : "✅ Quitado"}
                </span>
              </div>
              <div className="text-[10px] text-emerald-400 font-black pt-1">
                R$ {Number(validation.checks.depositValue?.accumulatedPaidAmount || validation.checks.depositValue?.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Partial payment guidance for guest */}
          {perspective === "VIAJANDO" && validation.checks.depositValue?.isPartial && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/15 p-2.5 text-xs text-amber-200">
              ⚠️ Pagamento Parcial: Acumulado <strong>R$ {Number(validation.checks.depositValue.accumulatedPaidAmount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong> de <strong>R$ {Number(validation.checks.depositValue.expected || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>. Falta: <strong className="text-emerald-300">R$ {Number(validation.checks.depositValue.remaining || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RatingStars({
  offerId,
  currentRating,
  perspective,
  startDateStr,
  onRatingSaved,
}: {
  offerId: number;
  currentRating: number | null | undefined;
  perspective: "VIAJANDO" | "HOSPEDANDO";
  startDateStr?: string | null;
  onRatingSaved: (newRating: number) => void;
}) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(currentRating || null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  useEffect(() => {
    setSelectedRating(currentRating || null);
  }, [currentRating]);

  const checkInDate = startDateStr ? new Date(startDateStr) : null;
  const today = new Date();

  // Rating is enabled if check-in date has arrived or passed (or if no startDate set)
  const isUnlocked = checkInDate
    ? new Date(today.getFullYear(), today.getMonth(), today.getDate()) >=
      new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())
    : true;

  const handleRate = async (starValue: number) => {
    if (!isUnlocked || saving) return;
    try {
      setSaving(true);
      setFeedbackMsg("");
      const res = await fetch("/api/minha-conta/ofertas/avaliar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, rating: starValue, perspective }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar avaliação.");
      }
      setSelectedRating(starValue);
      onRatingSaved(starValue);
      setFeedbackMsg(`⭐ Nota ${starValue}/10 salva!`);
      setTimeout(() => setFeedbackMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Erro ao salvar avaliação.");
    } finally {
      setSaving(false);
    }
  };

  const activeStars = hoverRating !== null ? hoverRating : (selectedRating || 0);

  return (
    <div className="inline-flex flex-col sm:flex-row items-start sm:items-center gap-1.5 sm:gap-2.5 bg-slate-950/80 border border-white/10 rounded-2xl px-3 py-1.5 shadow-inner">
      <div className="flex items-center gap-0.5 sm:gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((starNum) => {
          const isFilled = starNum <= activeStars;
          return (
            <button
              key={starNum}
              type="button"
              disabled={!isUnlocked || saving}
              onClick={() => handleRate(starNum)}
              onMouseEnter={() => isUnlocked && setHoverRating(starNum)}
              onMouseLeave={() => setHoverRating(null)}
              className={`p-0.5 rounded transition-all ${
                isUnlocked
                  ? "hover:scale-125 cursor-pointer"
                  : "opacity-40 cursor-not-allowed"
              }`}
              title={
                isUnlocked
                  ? `Dar nota ${starNum} de 10`
                  : `Avaliação liberada a partir do check-in (${checkInDate ? checkInDate.toLocaleDateString("pt-BR") : ""})`
              }
            >
              <Star
                size={16}
                className={`transition-colors ${
                  isFilled
                    ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                    : isUnlocked
                    ? "text-slate-600 hover:text-amber-300"
                    : "text-slate-700"
                }`}
              />
            </button>
          );
        })}
      </div>

      {isUnlocked ? (
        <span className="text-[11px] font-extrabold text-amber-400 shrink-0">
          {feedbackMsg || (activeStars > 0 ? `${activeStars}/10 ⭐` : "Avaliar (1-10)")}
        </span>
      ) : (
        <span className="text-[10px] font-bold text-amber-300/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
          🔒 Liberado no check-in ({checkInDate ? checkInDate.toLocaleDateString("pt-BR") : ""})
        </span>
      )}
    </div>
  );
}

function CheckInReleasePanel({
  offer,
  perspective,
  onUploadRemainingPix,
  onManualRelease,
  onSaveInstructions,
  uploadingId,
  validatingId,
}: {
  offer: OfferItem;
  perspective: "VIAJANDO" | "HOSPEDANDO";
  onUploadRemainingPix: (offerId: number, file: File) => void;
  onManualRelease: (offerId: number) => void;
  onSaveInstructions: (propertyId: number, instructions: string, checkInTime: string, checkOutTime: string) => void;
  uploadingId: number | null;
  validatingId: number | null;
}) {
  const statusStr = String(offer.status).toUpperCase();
  const isCheckInReleased = statusStr === "CHECKIN_LIBERADO" || !!offer.checkInReleasedAt;

  const totalStay = Number(offer.totalStayPrice || offer.offerPrice || 0);
  const depositPct = Number(offer.property?.depositPercentage || 20);
  const depositPaid = Number(offer.depositAmount || (totalStay * (depositPct / 100)));
  const remainingBalance = Math.max(0, Number((totalStay - depositPaid).toFixed(2)));

  const [instructions, setInstructions] = useState(offer.property?.checkInInstructions || "");
  const [checkInTime, setCheckInTime] = useState(offer.property?.checkInTime || "14:00");
  const [checkOutTime, setCheckOutTime] = useState(offer.property?.checkOutTime || "12:00");
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);

  if (isCheckInReleased) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <div>
              <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                Check-in Liberado com Sucesso!
              </h4>
              <p className="text-[11px] text-emerald-200">
                Estadia 100% quitada. Endereço e instruções de entrada liberados.
              </p>
            </div>
          </div>
          <span className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-300">
            ✅ CONFIRMADO
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-xs text-slate-200 pt-1">
          <div className="space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-1">🔑 Instruções & Wi-Fi:</div>
            <p className="text-slate-300 leading-relaxed">
              {offer.property?.checkInInstructions || "Consulte o anfitrião no WhatsApp para chaves e portaria."}
            </p>
            <div className="text-[11px] text-slate-400 pt-1">
              Check-in: <strong>{offer.property?.checkInTime || "14:00"}</strong> | Check-out: <strong>{offer.property?.checkOutTime || "12:00"}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <div className="font-bold text-emerald-300 flex items-center gap-1">📍 Endereço Completo:</div>
            <p className="text-slate-300 leading-relaxed">
              {[
                offer.property?.street ? `${offer.property.street}, ${offer.property.addressNumber || "s/n"}` : null,
                offer.property?.neighborhood,
                offer.property?.city && offer.property?.state ? `${offer.property.city} - ${offer.property.state}` : null,
                offer.property?.zipCode ? `CEP: ${offer.property.zipCode}` : null,
              ].filter(Boolean).join(" • ") || "Endereço cadastrado no imóvel."}
            </p>
            {(offer.property?.googleMapsLink || (offer.property?.city && offer.property?.street)) && (
              <div className="pt-1">
                <a
                  href={offer.property?.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${offer.property?.street || ""}, ${offer.property?.addressNumber || ""}, ${offer.property?.city || ""}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 hover:underline"
                >
                  🗺️ Ver Rota no Google Maps →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3 shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/15 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔒</span>
          <div>
            <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
              Check-in Bloqueado — Quitação do Saldo Pendente
            </h4>
            <p className="text-[11px] text-slate-300">
              Quite o saldo restante antes de ({offer.startDate ? new Date(offer.startDate).toLocaleDateString("pt-BR") : "A definir"} às {offer.property?.checkInTime || "14:00"}) para liberar as informações para checkin.
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Saldo Restante</span>
          <span className="text-base font-black text-amber-400">R$ {remainingBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {perspective === "VIAJANDO" && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-300">
            Chave Pix: <code className="bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-bold">{offer.property?.pixKey || "Consulte o anfitrião"}</code>
          </div>

          <label className={`rounded-xl px-4 py-2 text-xs font-black text-slate-950 transition cursor-pointer flex items-center justify-center gap-2 shadow-md ${
            uploadingId === offer.id || validatingId === offer.id
              ? "bg-slate-600 cursor-not-allowed shadow-none"
              : "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20"
          }`}>
            <Upload size={14} />
            {uploadingId === offer.id ? "Enviando..." : validatingId === offer.id ? "⏳ Analisando..." : `📎 Anexar Comprovante do Saldo (R$ ${remainingBalance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`}
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              disabled={uploadingId === offer.id || validatingId === offer.id}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadRemainingPix(offer.id, file);
              }}
            />
          </label>
        </div>
      )}

      {perspective === "HOSPEDANDO" && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsEditingInstructions(!isEditingInstructions)}
              className="text-xs font-bold text-sky-300 hover:underline flex items-center gap-1"
            >
              ✏️ {isEditingInstructions ? "Cancelar Edição" : "Configurar Instruções & Wi-Fi"}
            </button>

            <button
              type="button"
              onClick={() => onManualRelease(offer.id)}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-black text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={14} />
              <span>Confirmar Quitação & Liberar Check-in</span>
            </button>
          </div>

          {isEditingInstructions && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Check-in</label>
                  <input
                    type="text"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    placeholder="Ex: 14:00"
                    className="w-full rounded-lg bg-slate-950 border border-white/10 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Check-out</label>
                  <input
                    type="text"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    placeholder="Ex: 12:00"
                    className="w-full rounded-lg bg-slate-950 border border-white/10 p-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Instruções e Senha do Wi-Fi</label>
                <textarea
                  rows={2}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Ex: Wi-Fi: CasaPraia5G / Senha: 12345678"
                  className="w-full rounded-lg bg-slate-950 border border-white/10 p-2 text-xs text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (offer.propertyId) {
                    onSaveInstructions(offer.propertyId, instructions, checkInTime, checkOutTime);
                    setIsEditingInstructions(false);
                  }
                }}
                className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-400 transition"
              >
                Salvar Instruções
              </button>
            </div>
          )}
        </div>
      )}
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
  const [validationError, setValidationError] = useState<string | null>(null);

  // PayPal modal state for host acceptance
  const [paypalOfferId, setPaypalOfferId] = useState<number | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [paypalError, setPaypalError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // QR Code Popup Modal state
  const [selectedQrCodeModalUrl, setSelectedQrCodeModalUrl] = useState<string | null>(null);

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

  // Host manual approval of Pix receipt
  async function handleManualConfirmPix(offerId: number) {
    const confirmed = window.confirm(
      "Você deseja aprovar manualmente o comprovante Pix e confirmar esta reserva?"
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(offerId);
      const res = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_confirm_pix",
          offer_id: offerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao aprovar comprovante.");
      }

      await loadOffers();
    } catch (err: any) {
      alert(err.message || "Erro ao aprovar comprovante.");
    } finally {
      setActionLoadingId(null);
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
        const errorMsg = validateData.error || "Falha na verificação automática do comprovante.";
        setValidationError(errorMsg);
        // Still allow host to review manually
        // Optionally clear previous validation result
        setPixValidationResult(null);
      } else {
        setValidationError(null);
        if (validateData.allPassed) {
          alert("✅ Comprovante validado com sucesso! Sua reserva foi confirmada automaticamente.");
          setPixValidationResult({ offerId, validation: validateData.validation });
        } else {
          alert(`⚠️ Comprovante enviado. ${validateData.validation?.passedCount || 0} de 5 verificações passaram. O anfitrião irá analisar o comprovante.`);
          setPixValidationResult({ offerId, validation: validateData.validation });
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

  // Guest upload remaining balance Pix receipt
  async function handleUploadRemainingBalancePix(offerId: number, file: File) {
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

      // Step 2: Save receipt URL
      const saveRes = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload_remaining_balance_pix",
          offer_id: offerId,
          remainingBalanceReceiptUrl: uploadData.imageUrl,
          skipConfirm: true,
        }),
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || !saveData.success) {
        throw new Error(saveData.error || "Erro ao salvar comprovante.");
      }

      // Step 3: Run AI validation
      setUploadingOfferId(null);
      setValidatingOfferId(offerId);

      const validateRes = await fetch("/api/minha-conta/ofertas/validate-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offerId,
          imageUrl: uploadData.imageUrl,
          isRemainingBalance: true,
        }),
      });
      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.success) {
        alert(validateData.error || "Falha na verificação automática do comprovante de quitação.");
      } else {
        if (validateData.allPassed) {
          alert("✅ Comprovante de quitação do saldo da estadia validado com sucesso! Check-in LIBERADO 🎉");
        } else {
          alert(`⚠️ Comprovante enviado. ${validateData.validation?.passedCount || 0} de 5 verificações passaram. O anfitrião analisará.`);
        }
      }

      await loadOffers();
    } catch (err: any) {
      alert(err?.message || "Erro ao enviar comprovante de quitação.");
    } finally {
      setUploadingOfferId(null);
      setValidatingOfferId(null);
    }
  }

  // Host manual release checkin
  async function handleManualReleaseCheckin(offerId: number) {
    const confirmed = window.confirm(
      "Você deseja confirmar a quitação do saldo restante e liberar o check-in para este hóspede?"
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(offerId);
      const res = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_release_checkin",
          offer_id: offerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao liberar check-in.");
      }

      alert("🎉 Check-in liberado manualmente com sucesso!");
      await loadOffers();
    } catch (err: any) {
      alert(err.message || "Erro ao liberar check-in.");
    } finally {
      setActionLoadingId(null);
    }
  }

  // Host save check-in instructions
  async function handleSaveCheckInInstructions(
    propertyId: number,
    checkInInstructions: string,
    checkInTime: string,
    checkOutTime: string
  ) {
    try {
      const res = await fetch("/api/minha-conta/ofertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_checkin_instructions",
          propertyId,
          checkInInstructions,
          checkInTime,
          checkOutTime,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao salvar instruções.");
      }

      alert("✅ Instruções de Check-in salvas com sucesso!");
      await loadOffers();
    } catch (err: any) {
      alert(err.message || "Erro ao salvar instruções.");
    }
  }

  function closePaypalModal() {
    setPaypalOfferId(null);
    setPaypalOrderId(null);
    setPaypalError("");
  }

  function getStepPhase(offer: OfferItem): number {
    const s = String(offer.status).toUpperCase();
    if (s === "CHECKIN_LIBERADO" || offer.checkInReleasedAt) return 5;
    if (s === "RESERVA_CONFIRMADA" || s === "ACCEPTED" || s === "MATCHED" || offer.pixValidation?.allPassed) return 4;
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
                <span>Fases para Conclusão da Reserva</span>
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
                const isDepositFullyPaid = statusStr === "RESERVA_CONFIRMADA" || !!offer.pixValidation?.allPassed;
                const isCheckInReleased = statusStr === "CHECKIN_LIBERADO" || !!offer.checkInReleasedAt;
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
                      <div className="mb-5 border-b border-white/5 pb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <span>{currentPhase >= 5 ? "🎉" : currentSteps[Math.min(currentPhase - 1, 3)]?.icon}</span>
                            <span>
                              {currentPhase >= 5
                                ? "Reserva Confirmada (4 de 4 Etapas Concluídas)"
                                : `Etapa ${currentPhase} de 4: ${currentSteps[currentPhase - 1]?.title}`}
                            </span>
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            currentPhase >= 5
                              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                              : "bg-amber-500/20 border-amber-500/30 text-amber-300"
                          }`}>
                            {currentPhase >= 5 ? "4/4 Concluído" : `${currentPhase - 1}/4 Concluído`}
                          </span>
                        </div>

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
                                        : isDone || (isCurrent && currentPhase >= 5)
                                        ? "bg-emerald-500"
                                        : "bg-slate-800"
                                    }`}
                                  />
                                  <div
                                    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black border transition-all ${
                                      isDone || (isCurrent && currentPhase >= 5)
                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                                        : isCurrent
                                        ? "bg-emerald-500 text-slate-950 border-emerald-400 ring-4 ring-emerald-500/20 font-bold scale-110"
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
                                  className={`mt-1.5 text-[10px] md:text-xs font-bold text-center leading-tight whitespace-normal w-full px-0.5 ${
                                    isCurrent
                                      ? "text-emerald-400"
                                      : isDone
                                      ? "text-slate-300"
                                      : "text-slate-500"
                                  }`}
                                >
                                  {st.title}
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
                          {(isPending || isRejected) && (
                            <div className="pt-2">
                              {isPending && (
                                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                                  ⏳ {activeTab === "VIAJANDO" ? "Pedido enviado (Aguardando anfitrião por 24h)" : "Pedido recebido (Aguardando sua aprovação)"}
                                </span>
                              )}

                              {isRejected && (
                                <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                                  ❌ Pedido recusado
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* RIGHT COLUMN: 10-STARS RATING ON TOP + ACTION BUTTONS BELOW */}
                      <div className="flex flex-col items-start sm:items-end gap-3 shrink-0">
                        {/* 10-STARS RATING */}
                        {!isRejected && !isCancelled && (
                          <RatingStars
                            offerId={offer.id}
                            currentRating={activeTab === "VIAJANDO" ? offer.guestRating : offer.hostRating}
                            perspective={activeTab}
                            startDateStr={offer.startDate}
                            onRatingSaved={(newRating) => {
                              if (activeTab === "VIAJANDO") {
                                setGuestOffers((prev) =>
                                  prev.map((o) => (o.id === offer.id ? { ...o, guestRating: newRating } : o))
                                );
                              } else {
                                setHostOffers((prev) =>
                                  prev.map((o) => (o.id === offer.id ? { ...o, hostRating: newRating } : o))
                                );
                              }
                            }}
                          />
                        )}

                        {/* ACTIONS PER PERSPECTIVE */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                        {offer.property?.id && (
                          <Link
                            href={`/imovel/${offer.property.id}`}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 text-center transition"
                          >
                            Ver anúncio
                          </Link>
                        )}

                        {(isAcceptedWaiting || isConfirmed) && (
                          <Link
                            href={
                              offer.conversationId
                                ? `/minha-conta/chat?conversationId=${offer.conversationId}`
                                : `/minha-conta/chat?propertyId=${offer.propertyId}&buyerId=${offer.buyerId}`
                            }
                            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 text-center transition flex items-center justify-center gap-1.5"
                          >
                            💬 Abrir Chat
                          </Link>
                        )}

                        {!isPending && !isCancelled && !isRejected && !isConfirmed && !offer.pixValidation?.allPassed && (
                          <button
                            onClick={() => handleCancel(offer.id)}
                            className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-400/15 text-center cursor-pointer transition flex items-center justify-center gap-1.5"
                          >
                            <Ban size={13} />
                            <span>Cancelar reserva</span>
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
                  </div>

                    {/* DETAILS BOX FOR GUEST ("VIAJANDO") */}
                    {activeTab === "VIAJANDO" && (isAcceptedWaiting || isConfirmed) && (
                      <div className="mt-5 border-t border-white/10 pt-4 space-y-3 rounded-2xl bg-slate-950/70 p-4 border border-white/5">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck size={16} />
                            <span>Dados de Contato e Pagamento do Anfitrião</span>
                          </div>

                          {/* Top-Right Remaining Balance Upload Button (Only AFTER deposit is 100% paid) */}
                          {isDepositFullyPaid && !isCheckInReleased && (
                            <label className={`rounded-xl px-4 py-2 text-xs font-black text-slate-950 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shrink-0 ${
                              uploadingOfferId === offer.id || validatingOfferId === offer.id
                                ? "bg-slate-600 cursor-not-allowed shadow-none"
                                : "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20"
                            }`}>
                              <Upload size={14} />
                              {uploadingOfferId === offer.id
                                ? "Enviando..."
                                : validatingOfferId === offer.id
                                ? "⏳ Analisando..."
                                : `📎 Anexar Comprovante do Saldo (R$ ${Math.max(0, Number(offer.totalStayPrice || offer.offerPrice || 0) - Number(offer.depositAmount || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`}
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={uploadingOfferId === offer.id || validatingOfferId === offer.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUploadRemainingBalancePix(offer.id, file);
                                }}
                              />
                            </label>
                          )}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-300">
                          <div><strong>Anfitrião:</strong> {offer.property?.owner?.name || "Não informado"}</div>
                          <div><strong>E-mail:</strong> {offer.property?.owner?.email || "Não informado"}</div>
                          <div>
                            <strong>Telefone / WhatsApp:</strong>{" "}
                            {offer.property?.owner?.phone ? (
                              getWhatsAppUrl(offer.property.owner.phone) ? (
                                <a
                                  href={getWhatsAppUrl(offer.property.owner.phone)!}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300 underline transition cursor-pointer"
                                  title="Abrir no WhatsApp"
                                >
                                  <span>{offer.property.owner.phone}</span>
                                  <span className="no-underline bg-emerald-500/20 border border-emerald-500/40 rounded px-1.5 py-0.5 text-[11px]">💬 WhatsApp</span>
                                </a>
                              ) : (
                                <span>{offer.property.owner.phone}</span>
                              )
                            ) : (
                              "Não informado"
                            )}
                          </div>
                          <div>
                            <strong>Chave Pix:</strong>{" "}
                            <span className="font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {offer.property?.pixKey || "Consulte o anfitrião"}
                            </span>
                            {offer.property?.pixQrCodeUrl && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedQrCodeModalUrl(offer.property!.pixQrCodeUrl!)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer shadow-sm"
                                >
                                  <QrCode size={15} />
                                  <span>Visualizar QR Code Pix</span>
                                </button>
                              </div>
                            )}
                          </div>
                          {!isDepositFullyPaid && offer.depositAmount && (
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
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => handleCancel(offer.id)}
                                className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-xs font-bold text-red-300 hover:bg-red-400/15 transition cursor-pointer whitespace-nowrap"
                              >
                                Cancelar reserva
                              </button>
                              <label className={`rounded-xl px-4 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg whitespace-nowrap ${
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
                          </div>
                        )}

                        {/* After receipt sent — show validation result & all receipt links to guest */}
                        {getOfferReceiptUrls(offer).length > 0 && (
                          <div className="pt-3 border-t border-white/5 space-y-3">
                            {/* Validation analyzing state */}
                            {validatingOfferId === offer.id && (
                              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-300 flex items-center gap-2 animate-pulse">
                                <ShieldCheck size={14} />
                                <span>⏳ Analisando comprovante automaticamente...</span>
                              </div>
                            )}

                            {/* Validation result panel (includes receipt links inside Ver Detalhes) */}
                            {offer.pixValidation && validatingOfferId !== offer.id && (
                              <PixValidationPanel
                                validation={offer.pixValidation}
                                perspective="VIAJANDO"
                                receiptUrls={getOfferReceiptUrls(offer)}
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                            <ShieldCheck size={16} />
                            <span>Dados de Contato do Hóspede (Liberado)</span>
                          </div>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-300">
                          <div><strong>Hóspede:</strong> {offer.buyer?.name || "Não informado"}</div>
                          <div><strong>E-mail:</strong> {offer.buyer?.email || "Não informado"}</div>
                          <div>
                            <strong>Telefone / WhatsApp:</strong>{" "}
                            {offer.buyer?.phone ? (
                              getWhatsAppUrl(offer.buyer.phone) ? (
                                <a
                                  href={getWhatsAppUrl(offer.buyer.phone)!}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:text-emerald-300 underline transition cursor-pointer"
                                  title="Abrir no WhatsApp"
                                >
                                  <span>{offer.buyer.phone}</span>
                                  <span className="no-underline bg-emerald-500/20 border border-emerald-500/40 rounded px-1.5 py-0.5 text-[11px]">💬 WhatsApp</span>
                                </a>
                              ) : (
                                <span>{offer.buyer.phone}</span>
                              )
                            ) : (
                              "Não informado"
                            )}
                          </div>
                          {offer.depositAmount && (
                            <div>
                              <strong>Sinal Pix Solicitado:</strong>{" "}
                              <span className="font-extrabold text-emerald-400">R$ {Number(offer.depositAmount).toLocaleString("pt-BR")}</span>
                            </div>
                          )}
                        </div>

                        {getOfferReceiptUrls(offer).length > 0 ? (
                          <div className="pt-3 border-t border-white/10 space-y-3">
                            {/* AI Validation Panel (includes receipt links inside Ver Detalhes) */}
                            {offer.pixValidation ? (
                              <PixValidationPanel
                                validation={offer.pixValidation}
                                perspective="HOSPEDANDO"
                                receiptUrls={getOfferReceiptUrls(offer)}
                              />
                            ) : (
                              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-center gap-2">
                                <Clock size={13} />
                                <span>Verificação automática em processamento...</span>
                              </div>
                            )}

                            {/* Manual Host Approval Button if receipt sent but status not RESERVA_CONFIRMADA */}
                            {statusStr !== "RESERVA_CONFIRMADA" && !offer.pixValidation?.allPassed && (
                              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/30">
                                <div className="text-xs text-emerald-200 leading-relaxed">
                                  <strong className="text-emerald-300 block mb-0.5 font-extrabold text-sm">💡 Aprovação Manual do Anfitrião</strong>
                                  Deseja validar os comprovantes enviados e confirmar esta reserva agora?
                                </div>
                                <button
                                  onClick={() => handleManualConfirmPix(offer.id)}
                                  disabled={actionLoadingId === offer.id}
                                  className="w-full sm:w-auto shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-black text-slate-950 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                                >
                                  <CheckCircle2 size={16} />
                                  <span>Aceitar & Confirmar Reserva</span>
                                </button>
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

                    {/* CHECK-IN & REMAINING BALANCE PANEL FOR CONFIRMED RESERVATIONS */}
                    {((isConfirmed && activeTab === "HOSPEDANDO") || statusStr === "CHECKIN_LIBERADO" || offer.checkInReleasedAt) && (
                      <CheckInReleasePanel
                        offer={offer}
                        perspective={activeTab}
                        onUploadRemainingPix={handleUploadRemainingBalancePix}
                        onManualRelease={handleManualReleaseCheckin}
                        onSaveInstructions={handleSaveCheckInInstructions}
                        uploadingId={uploadingOfferId}
                        validatingId={validatingOfferId}
                      />
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
                      try {
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

                        // Close modal immediately to unmount PayPal overlay and unfreeze UI
                        closePaypalModal();

                        if (result.conversationId) {
                          router.push(`/minha-conta/chat?conversationId=${result.conversationId}`);
                        } else {
                          await loadOffers();
                        }
                      } catch (err: any) {
                        console.error("PAYPAL MODAL CAPTURE ERROR:", err);
                        setPaypalError(err?.message || "Erro ao processar pagamento no PayPal.");
                      }
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

        {/* QR CODE POPUP MODAL */}
        {selectedQrCodeModalUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
            onClick={() => setSelectedQrCodeModalUrl(null)}
          >
            <div
              className="relative max-w-md w-full rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl space-y-4 text-center border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedQrCodeModalUrl(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition"
                title="Fechar"
              >
                <X size={18} />
              </button>

              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-2">
                <QrCode size={18} />
                <span>QR Code Pix do Anfitrião</span>
              </div>

              <div className="flex justify-center p-2">
                <img
                  src={selectedQrCodeModalUrl}
                  alt="QR Code Pix do Anfitrião"
                  className="max-h-[60vh] max-w-full object-contain rounded-2xl border border-white/20 bg-white p-4 shadow-xl"
                />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed px-2">
                Abra o aplicativo do seu banco, selecione <strong>"Pagar com QR Code"</strong> e escaneie a imagem acima.
              </p>

              <div className="pt-2 flex items-center justify-center gap-3">
                <a
                  href={selectedQrCodeModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-sky-400 transition"
                >
                  Baixar / Abrir Original ↗
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedQrCodeModalUrl(null)}
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PayPalScriptProvider>
  );
}