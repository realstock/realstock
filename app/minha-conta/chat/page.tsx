"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Send, Building2, User, ArrowLeft, Loader2, RefreshCw, Bot } from "lucide-react";
import AutoMessagesModal from "./AutoMessagesModal";

type Conversation = {
  id: number;
  propertyId: number | null;
  buyerId: number;
  sellerId: number;
  lastMessage: string | null;
  updatedAt: string;
  property?: {
    id: number;
    title: string;
    city: string;
    neighborhood: string | null;
    price: number | string;
    listingType: string;
    images?: { imageUrl: string }[];
  } | null;
  buyer?: {
    id: number;
    name: string;
    avatar: string | null;
    email: string;
  };
  seller?: {
    id: number;
    name: string;
    avatar: string | null;
    email: string;
  };
};

type ChatMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  text: string;
  createdAt: string;
  sender?: {
    id: number;
    name: string;
    avatar: string | null;
  };
};

function ChatContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get("conversationId");
  const propertyIdParam = searchParams.get("propertyId");
  const buyerIdParam = searchParams.get("buyerId");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(
    initialConvId ? Number(initialConvId) : null
  );
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingConv, setLoadingConv] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);

  const currentUserId = session?.user ? Number((session.user as any).id) : null;

  // Protect route
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load conversation list
  async function fetchConversations(isSilent = false) {
    if (!isSilent) setLoadingConv(true);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (data.success) {
        let convs: Conversation[] = data.conversations || [];

        // If propertyIdParam was passed and not in list, auto-create via API
        if (propertyIdParam && buyerIdParam && !convs.some(c => c.propertyId === Number(propertyIdParam))) {
          try {
            const createRes = await fetch("/api/chat/conversations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                property_id: Number(propertyIdParam),
                target_user_id: Number(buyerIdParam),
              }),
            });
            const createData = await createRes.json();
            if (createData.success && createData.conversationId) {
              const refreshRes = await fetch("/api/chat/conversations");
              const refreshData = await refreshRes.json();
              if (refreshData.success) {
                convs = refreshData.conversations || [];
              }
              setActiveConvId(createData.conversationId);
            }
          } catch (createErr) {
            console.error("Erro ao auto-criar conversa:", createErr);
          }
        }

        setConversations(convs);

        // Determine active conversation
        if (initialConvId) {
          const targetId = Number(initialConvId);
          const found = convs.find((c) => c.id === targetId);
          if (found) {
            setActiveConvId(found.id);
          } else if (convs.length > 0) {
            setActiveConvId(convs[0].id);
          }
        } else if (propertyIdParam) {
          const targetPropId = Number(propertyIdParam);
          const found = convs.find((c) => c.propertyId === targetPropId);
          if (found) {
            setActiveConvId(found.id);
          } else if (convs.length > 0 && !activeConvId) {
            setActiveConvId(convs[0].id);
          }
        } else if (!activeConvId && convs.length > 0) {
          setActiveConvId(convs[0].id);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar conversas:", err);
    } finally {
      if (!isSilent) setLoadingConv(false);
    }
  }

  // Load messages for active conversation
  async function fetchMessages(convId: number, isSilent = false) {
    if (!isSilent) setLoadingMsgs(true);
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        setActiveConversation(data.conversation || null);
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    } finally {
      if (!isSilent) setLoadingMsgs(false);
    }
  }

  // Initial fetch
  useEffect(() => {
    if (session?.user) {
      fetchConversations();
    }
  }, [session]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConvId && session?.user) {
      fetchMessages(activeConvId);
    }
  }, [activeConvId, session]);

  const chatMessagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll internal chat container to bottom when messages update without moving the main browser window
  useEffect(() => {
    if (chatMessagesContainerRef.current) {
      chatMessagesContainerRef.current.scrollTop = chatMessagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Polling every 4 seconds for real-time messages & list update
  useEffect(() => {
    if (!session?.user) return;
    const interval = setInterval(() => {
      fetchConversations(true);
      if (activeConvId) {
        fetchMessages(activeConvId, true);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeConvId, session]);

  // Handle Send Message
  async function handleSendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!activeConvId || !newMessageText.trim() || sendingMsg) return;

    const text = newMessageText.trim();
    setNewMessageText("");
    setSendingMsg(true);

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConvId,
          text,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        fetchConversations(true);
      } else {
        alert(data.error || "Erro ao enviar mensagem.");
        setNewMessageText(text);
      }
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      setNewMessageText(text);
    } finally {
      setSendingMsg(false);
    }
  }

  // Helper to format timestamps
  function formatTime(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function formatDateHeader(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return "";
    }
  }

  // Get other user details in a conversation
  function getOtherParticipant(conv: Conversation) {
    if (!currentUserId) return null;
    return conv.buyerId === currentUserId ? conv.seller : conv.buyer;
  }

  if (status === "loading" || loadingConv) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin" size={24} />
          <span>Carregando suas mensagens...</span>
        </div>
      </div>
    );
  }

  const activeOtherUser = activeConversation ? getOtherParticipant(activeConversation) : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/minha-conta/ofertas"
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 hover:bg-white/10 transition"
              title="Voltar para Minhas Reservas"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                <MessageSquare className="text-emerald-400" size={24} />
                <span>Central de Chat e Mensagens</span>
              </h1>
              <p className="text-xs text-slate-400">
                Comunique-se diretamente com anfitriões e hóspedes sobre suas reservas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAutoModalOpen(true)}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 shadow-md shadow-emerald-500/10 transition cursor-pointer flex items-center gap-2"
              title="Configurar Mensagens Automáticas de Anfitrião"
            >
              <Bot size={16} className="text-emerald-400" />
              <span>⚙️ Mensagens Automáticas</span>
            </button>

            <button
              onClick={() => {
                fetchConversations();
                if (activeConvId) fetchMessages(activeConvId);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 transition flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>

        {/* AUTOMATIC MESSAGES MODAL */}
        <AutoMessagesModal
          isOpen={isAutoModalOpen}
          onClose={() => setIsAutoModalOpen(false)}
        />

        {/* CHAT CONTAINER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
          
          {/* CONVERSATION LIST (COL 1-4) */}
          <div className="lg:col-span-4 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-slate-900/90 font-bold text-sm text-slate-300 flex items-center justify-between">
              <span>Conversas ({conversations.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-400 space-y-2">
                  <MessageSquare size={36} className="opacity-40" />
                  <p className="text-xs">Nenhuma conversa ativa ainda.</p>
                  <p className="text-[11px] text-slate-500">
                    O chat será liberado automaticamente assim que o anfitrião aceitar o pedido de reserva.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const otherUser = getOtherParticipant(conv);
                  const isSelected = conv.id === activeConvId;
                  const propertyImg = conv.property?.images?.[0]?.imageUrl;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-emerald-500/15 border border-emerald-500/30"
                          : "hover:bg-white/5 border border-transparent"
                      }`}
                    >
                      <div className="relative h-11 w-11 shrink-0 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                        {otherUser?.avatar ? (
                          <Image
                            src={otherUser.avatar}
                            alt={otherUser.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-indigo-500/20 text-indigo-300 font-bold text-sm">
                            {otherUser?.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="text-xs font-bold text-white truncate">
                            {otherUser?.name || "Usuário"}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {formatDateHeader(conv.updatedAt)}
                          </span>
                        </div>

                        {conv.property && (
                          <div className="text-[11px] font-medium text-emerald-400 truncate flex items-center gap-1 mb-1">
                            <Building2 size={11} className="shrink-0" />
                            <span className="truncate">{conv.property.title}</span>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 truncate leading-relaxed">
                          {conv.lastMessage || "Nenhuma mensagem enviada."}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ACTIVE CHAT WINDOW (COL 5-12) */}
          <div className="lg:col-span-8 rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl flex flex-col overflow-hidden">
            {!activeConvId || !activeConversation ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 space-y-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10 text-emerald-400">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-base font-bold text-white">Selecione uma conversa</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Escolha uma conversa na lista ao lado para visualizar as mensagens e interagir em tempo real.
                </p>
              </div>
            ) : (
              <>
                {/* ACTIVE CHAT HEADER */}
                <div className="p-4 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-10 w-10 shrink-0 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                      {activeOtherUser?.avatar ? (
                        <Image
                          src={activeOtherUser.avatar}
                          alt={activeOtherUser.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-indigo-500/20 text-indigo-300 font-bold text-sm">
                          {activeOtherUser?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-white truncate">
                        {activeOtherUser?.name || "Usuário"}
                      </h2>
                      {activeConversation.property && (
                        <Link
                          href={`/imovel/${activeConversation.property.id}`}
                          target="_blank"
                          className="text-xs text-emerald-400 hover:underline truncate block"
                        >
                          📍 {activeConversation.property.title} ({activeConversation.property.city})
                        </Link>
                      )}
                    </div>
                  </div>

                  {activeConversation.property && (
                    <Link
                      href={`/imovel/${activeConversation.property.id}`}
                      target="_blank"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 transition shrink-0"
                    >
                      Ver Imóvel
                    </Link>
                  )}
                </div>

                {/* MESSAGES BODY */}
                <div ref={chatMessagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {loadingMsgs && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-xs text-slate-500">
                      Carregando histórico...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 text-xs">
                      Nenhuma mensagem enviada ainda. Digite abaixo para iniciar!
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUserId;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-4 text-xs leading-relaxed shadow-lg ${
                              isMe
                                ? "bg-emerald-600 text-white rounded-br-none"
                                : "bg-slate-800 text-slate-200 border border-white/10 rounded-bl-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            <div
                              className={`mt-1 text-[10px] text-right ${
                                isMe ? "text-emerald-200" : "text-slate-400"
                              }`}
                            >
                              {formatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* INPUT BAR */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-white/10 bg-slate-900/90 flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition"
                    disabled={sendingMsg}
                  />
                  <button
                    type="submit"
                    disabled={sendingMsg || !newMessageText.trim()}
                    className="rounded-xl bg-emerald-500 hover:bg-emerald-400 p-3 text-slate-950 font-bold disabled:opacity-50 transition cursor-pointer flex items-center justify-center"
                  >
                    {sendingMsg ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-slate-400 text-xs">
          Carregando...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
