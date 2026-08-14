"use client";

import { useState, useEffect } from "react";
import { Bot, Check, X, Loader2, Sparkles, RotateCcw, Info, PlusCircle, Clock, Edit3 } from "lucide-react";
import { TRIGGER_MOMENT_OPTIONS } from "@/lib/auto-messages";

type AutoSetting = {
  event: string;
  title: string;
  customTitle?: string;
  description: string;
  defaultText: string;
  isCustom?: boolean;
  targetEvent?: string;
  isEnabled: boolean;
  messageText: string;
};

const VARIABLE_PILLS = [
  { tag: "{hospede}", label: "Nome Hóspede" },
  { tag: "{imovel}", label: "Título Imóvel" },
  { tag: "{valor_sinal}", label: "Valor Sinal" },
  { tag: "{chave_pix}", label: "Chave Pix" },
  { tag: "{data_checkin}", label: "Data Check-in" },
  { tag: "{horario_checkin}", label: "Hora Check-in" },
  { tag: "{horario_checkout}", label: "Hora Check-out" },
  { tag: "{endereco}", label: "Endereço Imóvel" },
  { tag: "{wifi_senha}", label: "Wi-Fi & Chave" },
];

export default function AutoMessagesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<AutoSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load settings on modal open
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/chat/auto-messages");
      const data = await res.json();
      if (data.success && Array.isArray(data.settings)) {
        setSettings(data.settings);
      } else {
        setErrorMsg(data.error || "Erro ao carregar configurações.");
      }
    } catch (err: any) {
      console.error("Erro ao carregar mensagens automáticas:", err);
      setErrorMsg("Erro de conexão ao carregar mensagens automáticas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg("");
    try {
      const res = await fetch("/api/chat/auto-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setErrorMsg(data.error || "Erro ao salvar configurações.");
      }
    } catch (err: any) {
      console.error("Erro ao salvar mensagens automáticas:", err);
      setErrorMsg("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function handleToggle(eventKey: string) {
    setSettings((prev) =>
      prev.map((item) =>
        item.event === eventKey ? { ...item, isEnabled: !item.isEnabled } : item
      )
    );
  }

  function handleTextChange(eventKey: string, text: string) {
    setSettings((prev) =>
      prev.map((item) =>
        item.event === eventKey ? { ...item, messageText: text } : item
      )
    );
  }

  function handleTitleChange(eventKey: string, title: string) {
    setSettings((prev) =>
      prev.map((item) =>
        item.event === eventKey ? { ...item, customTitle: title, title: title || item.title } : item
      )
    );
  }

  function handleTargetEventChange(eventKey: string, targetEvent: string) {
    setSettings((prev) =>
      prev.map((item) =>
        item.event === eventKey ? { ...item, targetEvent } : item
      )
    );
  }

  function handleInsertVariable(eventKey: string, variableTag: string) {
    setSettings((prev) =>
      prev.map((item) =>
        item.event === eventKey
          ? { ...item, messageText: item.messageText + " " + variableTag }
          : item
      )
    );
  }

  function handleResetDefault(eventKey: string) {
    setSettings((prev) =>
      prev.map((item) =>
        item.event === eventKey ? { ...item, messageText: item.defaultText } : item
      )
    );
  }

  if (!isOpen) return null;

  const standardSettings = settings.filter((s) => !s.isCustom);
  const customSettings = settings.filter((s) => s.isCustom);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[90vh] rounded-3xl border border-emerald-500/30 bg-slate-900 p-5 md:p-6 shadow-2xl flex flex-col border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 transition cursor-pointer"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* HEADER */}
        <div className="border-b border-white/10 pb-4 mb-4">
          <div className="flex items-center gap-2.5 text-emerald-400 mb-1">
            <Bot size={22} />
            <h2 className="text-lg font-black text-white uppercase tracking-wider">
              Configuração de Mensagens Automáticas (6 Padrões + 4 Personalizadas)
            </h2>
          </div>
          <p className="text-xs text-slate-300">
            Defina o texto, os momentos de envio e crie até 4 mensagens adicionais personalizadas para seus hóspedes.
          </p>
        </div>

        {/* CONTENT AREA */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="animate-spin text-emerald-400" size={28} />
            <span className="text-xs font-bold">Carregando suas mensagens automáticas...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-6">
            {errorMsg && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            {saveSuccess && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <Check size={16} />
                <span>Configurações salvas com sucesso! As mensagens automáticas estão ativas.</span>
              </div>
            )}

            {/* VARIABLE PILLS INFO BOX */}
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3.5 text-xs text-sky-200 space-y-2">
              <div className="font-extrabold text-sky-300 flex items-center gap-1.5 text-xs">
                <Info size={14} />
                <span>Variáveis Automáticas Disponíveis:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Clique nas etiquetas para inserir no texto. Elas serão substituídas automaticamente pelos dados reais da reserva do hóspede!
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {VARIABLE_PILLS.map((pill) => (
                  <span
                    key={pill.tag}
                    className="rounded-lg bg-sky-950 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono text-sky-300 font-bold"
                  >
                    {pill.tag}
                  </span>
                ))}
              </div>
            </div>

            {/* SECTION 1: MENSAGENS PADRÃO DO SISTEMA (1 a 6) */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400 border-b border-white/10 pb-2">
                <Sparkles size={16} />
                <span>Mensagens Principais do Fluxo (1 a 6)</span>
              </div>

              {standardSettings.map((item) => (
                <div
                  key={item.event}
                  className={`rounded-2xl border p-4 transition-all ${
                    item.isEnabled
                      ? "border-emerald-500/30 bg-slate-950/70"
                      : "border-white/10 bg-slate-950/30 opacity-70"
                  }`}
                >
                  {/* Item Header with Toggle */}
                  <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 mb-3">
                    <div>
                      <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>{item.title}</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggle(item.event)}
                      className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-black transition cursor-pointer border ${
                        item.isEnabled
                          ? "bg-emerald-500 border-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
                          : "bg-slate-800 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {item.isEnabled ? "Ativado ✅" : "Desativado ⏸️"}
                    </button>
                  </div>

                  {/* Item Text & Controls */}
                  {item.isEnabled && (
                    <div className="space-y-2.5">
                      {/* Variable Insertion Pills */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                          Inserir:
                        </span>
                        {VARIABLE_PILLS.map((pill) => (
                          <button
                            key={pill.tag}
                            type="button"
                            onClick={() => handleInsertVariable(item.event, pill.tag)}
                            className="rounded-md bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 px-2 py-0.5 text-[10px] font-mono text-emerald-300 transition cursor-pointer"
                            title={`Inserir ${pill.label}`}
                          >
                            + {pill.tag}
                          </button>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        rows={3}
                        value={item.messageText}
                        onChange={(e) => handleTextChange(item.event, e.target.value)}
                        placeholder="Digite o texto da mensagem automática..."
                        className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none leading-relaxed"
                      />

                      {/* Footer controls for this item */}
                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleResetDefault(item.event)}
                          className="text-slate-400 hover:text-sky-300 transition flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          <span>Restaurar mensagem padrão</span>
                        </button>

                        <span className="text-slate-500 font-mono text-[10px]">
                          {item.messageText.length} caracteres
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SECTION 2: MENSAGENS PERSONALIZADAS EXTRAS (7 a 10) */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-400">
                  <PlusCircle size={16} />
                  <span>Mensagens Adicionais Personalizadas (+4 Vagas)</span>
                </div>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  4 Vagas Disponíveis
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Crie até 4 mensagens extras personalizadas (ex: Regras da Casa, Dicas da Cidade, Estacionamento) e escolha o momento exato em que devem ser enviadas!
              </p>

              {customSettings.map((item, idx) => (
                <div
                  key={item.event}
                  className={`rounded-2xl border p-4 transition-all ${
                    item.isEnabled
                      ? "border-amber-500/40 bg-amber-950/20"
                      : "border-white/10 bg-slate-950/30 opacity-70"
                  }`}
                >
                  {/* Custom Title & Trigger Moment */}
                  <div className="space-y-3 border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-2">
                        <Edit3 size={14} className="text-amber-400 shrink-0" />
                        <input
                          type="text"
                          value={item.customTitle || item.title}
                          onChange={(e) => handleTitleChange(item.event, e.target.value)}
                          placeholder={`Mensagem Personalizada #${idx + 1}`}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggle(item.event)}
                        className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-black transition cursor-pointer border ${
                          item.isEnabled
                            ? "bg-amber-400 border-amber-300 text-slate-950 shadow-md shadow-amber-400/20"
                            : "bg-slate-800 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        {item.isEnabled ? "Ativado ✅" : "Desativado ⏸️"}
                      </button>
                    </div>

                    {item.isEnabled && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-white/5 text-xs">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5 shrink-0">
                          <Clock size={14} className="text-amber-400" />
                          <span>Momento do Disparo:</span>
                        </span>
                        <select
                          value={item.targetEvent || "MANUAL_ONLY"}
                          onChange={(e) => handleTargetEventChange(item.event, e.target.value)}
                          className="flex-1 rounded-lg bg-slate-950 border border-amber-500/30 px-3 py-1.5 text-xs text-white font-semibold focus:border-amber-400 focus:outline-none"
                        >
                          {TRIGGER_MOMENT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Item Text & Controls */}
                  {item.isEnabled && (
                    <div className="space-y-2.5">
                      {/* Variable Insertion Pills */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                          Inserir:
                        </span>
                        {VARIABLE_PILLS.map((pill) => (
                          <button
                            key={pill.tag}
                            type="button"
                            onClick={() => handleInsertVariable(item.event, pill.tag)}
                            className="rounded-md bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 px-2 py-0.5 text-[10px] font-mono text-amber-300 transition cursor-pointer"
                            title={`Inserir ${pill.label}`}
                          >
                            + {pill.tag}
                          </button>
                        ))}
                      </div>

                      {/* Textarea */}
                      <textarea
                        rows={3}
                        value={item.messageText}
                        onChange={(e) => handleTextChange(item.event, e.target.value)}
                        placeholder="Digite o conteúdo da sua mensagem personalizada..."
                        className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none leading-relaxed"
                      />

                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleResetDefault(item.event)}
                          className="text-slate-400 hover:text-amber-300 transition flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          <span>Restaurar texto inicial</span>
                        </button>

                        <span className="text-slate-500 font-mono text-[10px]">
                          {item.messageText.length} caracteres
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 transition cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 text-xs font-black text-slate-950 transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Salvar Configurações</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
