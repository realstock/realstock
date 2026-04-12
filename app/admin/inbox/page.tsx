"use client";

import { useState, useEffect } from "react";
import { Mail, Reply, Send, User, Clock, Trash2, ArrowLeft } from "lucide-react";

export default function AdminInboxPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/emails");
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedEmail) return;
    setSending(true);
    try {
      // Determine recipient (if INBOUND, reply to sender. If OUTBOUND, reply to recipient)
      const to = selectedEmail.direction === "INBOUND" ? selectedEmail.sender : selectedEmail.recipient;
      const subject = selectedEmail.subject?.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`;

      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject,
          htmlBody: `<div style="font-family:sans-serif; white-space:pre-wrap;">${replyText.replace(/\n/g, "<br/>")}</div><br/><hr/><br/><blockquote>${selectedEmail.htmlBody || selectedEmail.textBody}</blockquote>`,
          inReplyToId: selectedEmail.id,
        })
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        fetchEmails(); // Reload to see the new outbound message
      } else {
        alert("Erro ao enviar: " + data.error);
      }
    } catch (e) {
      alert("Erro na rede.");
    }
    setSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-950 text-white">
      {/* Lista Laterial (Threads) */}
      <div className={`w-full md:w-1/3 flex-shrink-0 border-r border-white/10 bg-slate-900/50 flex flex-col ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/80">
          <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="text-indigo-400" /> Caixa de Entrada</h2>
          <button onClick={fetchEmails} className="text-xs text-indigo-300 hover:text-white px-2 py-1 rounded bg-indigo-500/10">Atualizar</button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Carregando mensagens...</div>
          ) : emails.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum e-mail encontrado.</div>
          ) : (
            emails.map(email => (
              <div 
                key={email.id} 
                onClick={() => setSelectedEmail(email)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${selectedEmail?.id === email.id ? 'bg-indigo-500/20 border-l-4 border-l-indigo-500' : 'hover:bg-white/5'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-sm truncate pr-2 flex items-center gap-1">
                    {email.direction === "OUTBOUND" ? <Reply size={12} className="text-green-400"/> : <User size={12} className="text-blue-400"/>}
                    {email.direction === "INBOUND" ? email.sender : `Para: ${email.recipient}`}
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0">{new Date(email.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</div>
                </div>
                <div className="text-sm font-medium text-slate-200 truncate">{email.subject || '(Sem Assunto)'}</div>
                <div className="text-xs text-slate-400 truncate mt-1">{email.textBody || email.htmlBody?.replace(/<[^>]+>/g, '').substring(0, 50)}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Visualizador de Email */}
      <div className={`w-full md:w-2/3 flex flex-col bg-slate-950 ${!selectedEmail ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!selectedEmail ? (
          <div className="text-slate-600 flex flex-col items-center">
            <Mail size={48} className="mb-4 opacity-50" />
            <p>Selecione um e-mail para ler.</p>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-white/10 bg-slate-900/40">
              <div className="flex items-center gap-4 mb-4 md:hidden">
                 <button onClick={() => setSelectedEmail(null)} className="p-2 bg-white/10 rounded-full"><ArrowLeft size={16} /></button>
                 <span className="font-bold text-sm">Voltar</span>
              </div>
              <h1 className="text-2xl font-bold mb-4">{selectedEmail.subject || '(Sem Assunto)'}</h1>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold">
                    {(selectedEmail.direction === "INBOUND" ? selectedEmail.sender : selectedEmail.recipient).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">
                      {selectedEmail.direction === "INBOUND" ? selectedEmail.sender : 'Minha Empresa (Equipe)'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {selectedEmail.direction === "INBOUND" ? 'Para: contato@realstock.com.br' : `Para: ${selectedEmail.recipient}`}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(selectedEmail.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || `<p>${selectedEmail.textBody || ''}</p>` }} className="text-slate-300 bg-white/5 p-6 rounded-2xl border border-white/10 overflow-x-auto text-sm leading-relaxed whitespace-pre-wrap [&_a]:text-indigo-400 [&_a]:underline"></div>
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900/80">
              <div className="bg-slate-950 rounded-2xl border border-white/10 p-3 focus-within:border-indigo-500/50 transition-colors">
                <textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Responder para ${selectedEmail.direction === "INBOUND" ? selectedEmail.sender : selectedEmail.recipient}...`}
                  className="w-full bg-transparent resize-none text-sm outline-none placeholder:text-slate-600 min-h-[80px]"
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="text-xs text-slate-500"><Trash2 size={16} className="cursor-pointer hover:text-red-400 transition-colors" onClick={() => setReplyText("")}/></div>
                  <button 
                    onClick={handleSendReply}
                    disabled={sending || !replyText.trim()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  >
                    {sending ? 'Enviando...' : <><Send size={16} /> Enviar Resposta</>}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
