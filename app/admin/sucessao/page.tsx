"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Mail,
  Send,
  Terminal,
  Copy,
  Check,
  BookOpen,
  Server,
  KeyRound,
  Bot,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Wallet,
  DollarSign,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Info
} from "lucide-react";
import LoadingScreen from "@/components/LoadingScreen";

export default function SucessaoPage() {
  const [activeTab, setActiveTab] = useState<"TUTORIAL" | "DEAD_MANS_SWITCH" | "CONTABILIDADE">("TUTORIAL");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Formulário de configurações
  const [ownerEmail, setOwnerEmail] = useState("leobatisti@gmail.com");
  const [successorEmail, setSuccessorEmail] = useState("isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com");
  const [accountingEmailRecipient, setAccountingEmailRecipient] = useState("isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com");
  const [thresholdDays, setThresholdDays] = useState(180);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/sucessao");
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.status) {
          setOwnerEmail(json.status.ownerEmail);
          setSuccessorEmail(json.status.successorEmail || "isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com");
          setAccountingEmailRecipient(json.status.accountingEmailRecipient || "isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com");
          setThresholdDays(json.status.inactivityThresholdDays || 180);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAction(actionName: string, payload: any = {}) {
    try {
      setActionLoading(actionName);
      setFeedbackMessage(null);

      const res = await fetch("/api/admin/sucessao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName, ...payload }),
      });

      const json = await res.json();

      if (json.success) {
        setFeedbackMessage({ type: "success", text: json.message || "Ação executada com sucesso!" });
        loadData();
      } else {
        setFeedbackMessage({ type: "error", text: json.error || "Erro ao executar ação." });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: "error", text: err?.message || "Erro na conexão." });
    } finally {
      setActionLoading(null);
    }
  }

  function copyText(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  }

  if (loading && !data) {
    return <LoadingScreen title="Plano de Sucessão" subtitle="Carregando telemetria e guias operacionais..." />;
  }

  const status = data?.status;
  const daysInactive = status?.daysSinceLastActivity ?? 0;
  const daysRemaining = status?.daysRemaining ?? 180;
  const totalDays = status?.inactivityThresholdDays ?? 180;
  const progressPercent = Math.min(100, Math.round((daysInactive / totalDays) * 100));

  const prompts = [
    {
      title: "Verificar integridade do site",
      prompt: "Antigravity, verifique se o site RealStock está funcionando normalmente e se há algum erro recente nos logs ou banco de dados.",
    },
    {
      title: "Fazer deploy das alterações na Vercel",
      prompt: "Antigravity, por favor execute o deploy em produção da plataforma na Vercel para aplicar as últimas alterações.",
    },
    {
      title: "Aprovar ou desativar anúncios de imóveis",
      prompt: "Antigravity, me mostre como posso moderar os imóveis anunciados no site e aprovar ou remover os que não atendem às regras.",
    },
    {
      title: "Conferir pagamentos e taxas do PayPal",
      prompt: "Antigravity, liste os últimos pagamentos recebidos via PayPal e confirme se as taxas dos contatos foram liberadas corretamente.",
    },
    {
      title: "O que fazer se o site sair do ar",
      prompt: "Antigravity, o site parece estar inacessível. Verifique o status da hospedagem na Vercel e a conexão com o Supabase para resolver.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 sm:px-6 pt-24 pb-20 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* TOPO: Navegação & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              ← Painel Admin
            </Link>
            <span className="text-xs text-slate-500">•</span>
            <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-medium">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Plano de Sucessão & Manual (Isaac & Ravi)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction("ping")}
              disabled={actionLoading === "ping"}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${actionLoading === "ping" ? "animate-spin" : ""}`} />
              Confirmar Atividade (Resetar 180 dias)
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div
            className={`flex items-center justify-between gap-3 rounded-2xl p-4 border ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              {feedbackMessage.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              {feedbackMessage.text}
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-xs opacity-70 hover:opacity-100">
              Dispensar
            </button>
          </div>
        )}

        {/* HEADER PRINCIPAL */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-inner">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Manual de Sucessão & Gestão RealStock
                </h1>
                <p className="mt-0.5 text-sm text-slate-400">
                  Instruções para <strong>Isaac Luz de Faria</strong> e <strong>Ravi Luz de Faria</strong> assumirem a plataforma e monitoramento de inatividade
                </p>
              </div>
            </div>
          </div>

          {/* STATUS RÁPIDO DO DEAD-MAN'S SWITCH */}
          <div className="flex items-center gap-3 bg-slate-900/90 border border-white/10 p-3 rounded-2xl">
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-medium text-slate-400">Dead-Man's Switch (6 meses)</span>
              <span className="text-xs font-bold text-white">
                {status?.isExpired ? (
                  <span className="text-rose-400">Inativo ({daysInactive} dias sem login)</span>
                ) : (
                  <span className="text-emerald-400">Ativo ({daysRemaining} dias restantes)</span>
                )}
              </span>
            </div>
            <div className={`h-3 w-3 rounded-full ${status?.isExpired ? "bg-rose-500 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
          </div>
        </div>

        {/* ABAS */}
        <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("TUTORIAL")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "TUTORIAL"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            📖 Manual do Isaac & Ravi (Antigravity)
          </button>

          <button
            onClick={() => setActiveTab("DEAD_MANS_SWITCH")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "DEAD_MANS_SWITCH"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            🛡️ Monitor Dead-Man's Switch (6 Meses)
          </button>

          <button
            onClick={() => setActiveTab("CONTABILIDADE")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              activeTab === "CONTABILIDADE"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`}
          >
            <Wallet className="h-4 w-4" />
            📊 Contabilidade Pessoal Mensal (Isaac & Ravi)
          </button>
        </div>

        {/* ============================================================== */}
        {/* ABA 1: TUTORIAL COMPLETO PARA PESSOA LEIGA (ISAAC E RAVI)     */}
        {/* ============================================================== */}
        {activeTab === "TUTORIAL" && (
          <div className="space-y-8">
            
            {/* BOAS-VINDAS / RESUMO */}
            <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
                  <Bot className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                  <span className="inline-block rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Para Isaac Luz de Faria & Ravi Luz de Faria
                  </span>
                  <h2 className="text-2xl font-bold text-white">Como assumir e cuidar do RealStock sem serem programadores</h2>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
                    Isaac e Ravi, não se preocupem: vocês não precisam escrever código. Toda a manutenção do site pode ser feita conversando diretamente com a inteligência artificial <strong>Google Antigravity</strong> em português claro. O Antigravity funciona como um programador sênior particular que executa tudo o que vocês pedirem no site.
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 1: CONECTAR O ANTIGRAVITY AUTOMATICAMENTE */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">1. Como Ligar o Antigravity ao Projeto (1 Clique)</h3>
                  <p className="text-xs text-slate-400">O comando abaixo abre o Antigravity já conectado ao RealStock</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="https://antigravity.google"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Baixar Aplicativo Google Antigravity (Download Oficial)
                  </a>
                  <span className="text-xs text-slate-400">Disponível para macOS e Windows</span>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed">
                  No computador de vocês, abram o terminal e colem o comando abaixo para clonar o projeto do GitHub e iniciar o Antigravity com poderes totais:
                </p>

                <div className="relative flex items-center justify-between gap-4 rounded-2xl bg-black/80 border border-white/10 px-4 py-3.5 font-mono text-sm text-emerald-400">
                  <div className="truncate selection:bg-emerald-500/30">
                    git clone https://github.com/realstock/realstock.git && cd realstock && ./setup-antigravity.sh
                  </div>
                  <button
                    onClick={() => copyText("git clone https://github.com/realstock/realstock.git && cd realstock && ./setup-antigravity.sh", 999)}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs text-white transition"
                  >
                    {copiedIndex === 999 ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar Comando</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/5 p-4 text-xs text-slate-400 space-y-1.5">
                  <p className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Info className="h-4 w-4 text-sky-400" /> O que esse comando faz:
                  </p>
                  <p>1. <strong>Baixa o código:</strong> Clona o repositório oficial do GitHub na máquina de vocês.</p>
                  <p>2. <strong>Instala tudo:</strong> Prepara dependências e verifica a instalação do Antigravity.</p>
                  <p>3. <strong>Conecta Vercel & Supabase:</strong> Orienta a sincronização segura das chaves do banco de dados na nuvem.</p>
                  <p>4. <strong>Poderes de Owner:</strong> A IA abre pré-configurada para reconhecer Isaac e Ravi como novos administradores plenos.</p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    *(Caso estejam usando diretamente o computador do Leo, basta rodar <code>cd /Users/leobatisti/realstock && ./setup-antigravity.sh</code>)*
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: O QUE PEDIR AO ANTIGRAVITY (PROMPTS PRONTOS) */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">2. Frases Prontas para Pedir ao Antigravity</h3>
                  <p className="text-xs text-slate-400">Copie e cole qualquer uma dessas frases no chat do Antigravity</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {prompts.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{item.title}</div>
                      <p className="mt-2 text-sm text-slate-200 italic font-mono bg-black/40 p-3 rounded-xl border border-white/5">
                        "{item.prompt}"
                      </p>
                    </div>
                    <button
                      onClick={() => copyText(item.prompt, idx)}
                      className="self-start flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Frase</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO 3: ONDE AS COISAS ESTÃO HOSPEDADAS (MAPA DE SERVIÇOS) */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">3. Inventário de Acessos e Onde o Site Vive</h3>
                  <p className="text-xs text-slate-400">Os 5 serviços essenciais para o site continuar funcionando</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Hospedagem Web</span>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">Vercel</span>
                  </div>
                  <h4 className="text-base font-bold text-white">Vercel (vercel.com)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    É onde o código do RealStock roda online. Sempre que o Antigravity rodar um deploy, ele publica direto aqui.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Banco de Dados</span>
                    <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[10px] font-bold">Supabase</span>
                  </div>
                  <h4 className="text-base font-bold text-white">Supabase (supabase.com)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Guarda todos os imóveis, fotos, usuários, mensagens e contabilidade. Não altere nada manualmente aqui sem a IA.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Recebimento</span>
                    <span className="rounded-full bg-blue-500/20 text-blue-400 px-2 py-0.5 text-[10px] font-bold">PayPal</span>
                  </div>
                  <h4 className="text-base font-bold text-white">PayPal (paypal.com)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    As taxas pagas pelos usuários na liberação de contatos e reservas caem na conta PayPal cadastrada.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Disparo de E-mails</span>
                    <span className="rounded-full bg-purple-500/20 text-purple-400 px-2 py-0.5 text-[10px] font-bold">Resend</span>
                  </div>
                  <h4 className="text-base font-bold text-white">Resend (resend.com)</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Serviço de envio automático dos e-mails de propostas, contatos e o seu relatório mensal de contabilidade pessoal.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Endereço Web</span>
                    <span className="rounded-full bg-yellow-500/20 text-yellow-400 px-2 py-0.5 text-[10px] font-bold">DNS</span>
                  </div>
                  <h4 className="text-base font-bold text-white">realstock.com.br</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Domínio principal registrado que aponta para a Vercel. Garanta que a anuidade dele no Registro.br esteja em dia.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Documento Local</span>
                    <span className="rounded-full bg-indigo-500/20 text-indigo-400 px-2 py-0.5 text-[10px] font-bold">Guia</span>
                  </div>
                  <h4 className="text-base font-bold text-white">INSTRUCOES_ISAAC.md</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Arquivo em texto puro salvo na raiz da pasta do RealStock com todas as explicações em caso de emergência offline.
                  </p>
                </div>
              </div>
            </div>

            {/* SEÇÃO 4: DIA A DIA NO PAINEL ADMIN */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">4. Rotina Fácil no Painel Administrativo</h3>
                  <p className="text-xs text-slate-400">O que você precisa olhar periodicamente no site</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Link
                  href="/admin/imoveis"
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition block"
                >
                  <div className="text-sm font-bold text-white">1. Imóveis</div>
                  <p className="mt-1 text-xs text-slate-400">Aprove ou delete anúncios com dados incorretos.</p>
                </Link>

                <Link
                  href="/admin/ofertas"
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition block"
                >
                  <div className="text-sm font-bold text-white">2. Ofertas</div>
                  <p className="mt-1 text-xs text-slate-400">Acompanhe propostas de compra e temporada.</p>
                </Link>

                <Link
                  href="/admin/pagamentos"
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition block"
                >
                  <div className="text-sm font-bold text-white">3. Pagamentos</div>
                  <p className="mt-1 text-xs text-slate-400">Veja taxas aprovadas no PayPal e Pix.</p>
                </Link>

                <Link
                  href="/admin/inbox"
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition block"
                >
                  <div className="text-sm font-bold text-white">4. Caixa de Entrada</div>
                  <p className="mt-1 text-xs text-slate-400">Responda e-mails de suporte dos clientes.</p>
                </Link>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 2: MONITOR DO DEAD-MAN'S SWITCH (6 MESES)                  */}
        {/* ============================================================== */}
        {activeTab === "DEAD_MANS_SWITCH" && (
          <div className="space-y-8">
            
            {/* CARD DE MONITORAMENTO DO GATILHO */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Mecanismo de Segurança</span>
                  <h3 className="text-2xl font-bold text-white mt-1">Dead-Man's Switch (Inatividade de 6 Meses)</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Se <strong>{status?.ownerEmail}</strong> ficar mais de 180 dias sem login, as instruções completas são disparadas para <strong>{status?.successorEmail}</strong>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction("ping")}
                    disabled={actionLoading === "ping"}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                  >
                    <RotateCcw className={`h-4 w-4 ${actionLoading === "ping" ? "animate-spin" : ""}`} />
                    Estou Aqui (Zerar Contador)
                  </button>
                </div>
              </div>

              {/* BARRA DE PROGRESSO DOS DIAS */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Inatividade atual: <strong>{daysInactive} dias</strong></span>
                  <span>Limite do gatilho: <strong>{totalDays} dias (6 meses)</strong></span>
                </div>
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-500 ${
                      status?.isExpired
                        ? "bg-rose-500"
                        : progressPercent > 80
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>0 dias</span>
                  <span>90 dias</span>
                  <span>180 dias (Disparo para Isaac e Ravi)</span>
                </div>
              </div>

              {/* CARDS DE TELEMETRIA */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-400">Última Conexão de Leo Batisti</div>
                  <div className="mt-1 text-base font-bold text-white">
                    {status?.lastOwnerActivityAt ? new Date(status.lastOwnerActivityAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "N/D"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-400">Dias Restantes para Disparo</div>
                  <div className={`mt-1 text-2xl font-black ${daysRemaining < 30 ? "text-amber-400" : "text-emerald-400"}`}>
                    {daysRemaining} dias
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-400">Status do E-mail de Sucessão</div>
                  <div className="mt-1 text-base font-bold">
                    {status?.successionEmailSent ? (
                      <span className="text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> Disparado
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1.5">
                        <Check className="h-4 w-4" /> Em Espera (Protegido)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SEÇÃO DE TESTES E DEMONSTRAÇÃO */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Testes do Sistema de Sucessão</h3>
                  <p className="text-xs text-slate-400">Dispare e-mails de teste e simulações para validar o fluxo</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => handleAction("test_succession_email", { recipient: successorEmail })}
                  disabled={actionLoading === "test_succession_email"}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  <Mail className="h-4 w-4" />
                  {actionLoading === "test_succession_email" ? "Enviando..." : "Enviar E-mail de Sucessão para Isaac & Ravi"}
                </button>

                <button
                  onClick={() => handleAction("simulate_inactivity", { days: 185 })}
                  disabled={actionLoading === "simulate_inactivity"}
                  className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 transition disabled:opacity-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Simular Inatividade de 185 Dias (Para Demonstração)
                </button>

                <button
                  onClick={() => handleAction("ping")}
                  disabled={actionLoading === "ping"}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  <RotateCcw className="h-4 w-4" />
                  Resetar Simulação (Marcar Presente)
                </button>
              </div>
            </div>

            {/* CONFIGURAÇÃO DE PARÂMETROS */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <h3 className="text-xl font-bold text-white">Configurações de E-mails & Tolerância</h3>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">E-mail do Proprietário (Leo)</label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">E-mails dos Sucessores (Isaac e Ravi)</label>
                  <input
                    type="text"
                    value={successorEmail}
                    onChange={(e) => setSuccessorEmail(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    placeholder="email1@gmail.com, email2@gmail.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Prazo de Inatividade (Dias)</label>
                  <input
                    type="number"
                    value={thresholdDays}
                    onChange={(e) => setThresholdDays(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={() => handleAction("update_config", {
                  ownerEmail,
                  successorEmail,
                  accountingEmailRecipient,
                  inactivityThresholdDays: thresholdDays
                })}
                disabled={actionLoading === "update_config"}
                className="flex items-center gap-2 rounded-xl bg-white hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-950 transition"
              >
                Salvar Configurações
              </button>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* ABA 3: CONTABILIDADE PESSOAL MENSAL (ISAAC)                   */}
        {/* ============================================================== */}
        {activeTab === "CONTABILIDADE" && (
          <div className="space-y-8">
            
            {/* STATUS DO ENVIO MENSAL */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Rotina Mensal Automatizada</span>
                  <h3 className="text-2xl font-bold text-white mt-1">Envio da Contabilidade Pessoal para Isaac & Ravi</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Todo mês o sistema fecha o balanço e envia o resumo com receitas, despesas e patrimônio para <strong>{status?.accountingEmailRecipient || "isaacluzdefaria@gmail.com, raviluzdefaria@gmail.com"}</strong>.
                  </p>
                </div>

                <button
                  onClick={() => handleAction("send_accounting", { recipient: accountingEmailRecipient })}
                  disabled={actionLoading === "send_accounting"}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  <Send className={`h-4 w-4 ${actionLoading === "send_accounting" ? "animate-spin" : ""}`} />
                  {actionLoading === "send_accounting" ? "Disparando..." : "Disparar Relatório Deste Mês Agora"}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-400">Último E-mail Enviado</div>
                  <div className="mt-1 text-sm font-bold text-white">
                    {status?.lastAccountingSentAt ? new Date(status.lastAccountingSentAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    }) : "Nenhum registro ainda"}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-400">Frequência Programada</div>
                  <div className="mt-1 text-sm font-bold text-emerald-400">
                    Mensal (Automático via Cron)
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-400">Painel Detalhado</div>
                  <Link
                    href="/admin/contabilidade-pessoal"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-indigo-400 hover:underline"
                  >
                    Ver Lançamentos e Faturas <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* PRÉVIA DOS DADOS DO MÊS */}
            {data?.accountingPreview && (
              <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">
                    Prévia do Relatório ({data.accountingPreview.monthName}/{data.accountingPreview.year})
                  </h3>
                  <span className="text-xs text-slate-400">
                    {data.accountingPreview.transactionsCount} lançamentos contabilizados
                  </span>
                </div>

                {/* Cards de Métricas */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs text-slate-400">Receitas</div>
                    <div className="mt-1 text-xl font-black text-emerald-400">
                      R$ {Number(data.accountingPreview.totalIncome).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs text-slate-400">Despesas Efetivas</div>
                    <div className="mt-1 text-xl font-black text-rose-400">
                      R$ {Number(data.accountingPreview.totalExpenses).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs text-slate-400">Saldo Líquido</div>
                    <div className={`mt-1 text-xl font-black ${data.accountingPreview.netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      R$ {Number(data.accountingPreview.netBalance).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Balanço Patrimonial */}
                {data.accountingPreview.balanceSheet && (
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Balanço Patrimonial Pessoal</div>
                    <div className="grid gap-4 sm:grid-cols-3 text-sm">
                      <div>
                        <span className="text-slate-400">Total de Ativos: </span>
                        <strong className="text-emerald-400">
                          R$ {Number(data.accountingPreview.balanceSheet.totalAssets).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Total de Passivos: </span>
                        <strong className="text-rose-400">
                          R$ {Number(data.accountingPreview.balanceSheet.totalLiabilities).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Patrimônio Líquido: </span>
                        <strong className="text-sky-400">
                          R$ {Number(data.accountingPreview.balanceSheet.netWorth).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}
