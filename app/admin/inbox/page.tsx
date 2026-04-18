"use client";

import { useState, useEffect } from "react";
import { Mail, Reply, Send, User, Clock, Trash2, ArrowLeft, Inbox, SendHorizontal, Plus, X, SendHorizonal, ShieldAlert, CheckCheck } from "lucide-react";

export default function AdminInboxPage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [newEmail, setNewEmail] = useState({ to: "", subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'INBOX' | 'SENT' | 'SPAM'>('INBOX');

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

  const filteredEmails = emails.filter(email => {
    if (filter === 'SPAM') return email.status === 'SPAM';
    if (email.status === 'SPAM') return false; // Nunca mostrar spam nas outras abas
    
    if (filter === 'INBOX') return email.direction === 'INBOUND';
    if (filter === 'SENT') return email.direction === 'OUTBOUND';
    return true;
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/admin/emails/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchEmails();
        if (selectedEmail?.id === id) {
          setSelectedEmail(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedEmail) return;
    setSending(true);
    try {
      const to = selectedEmail.direction === "INBOUND" ? selectedEmail.sender : selectedEmail.recipient;
      const toEmail = to.includes("<") ? to.match(/<([^>]+)>/)?.[1] : to;
      
      const subject = selectedEmail.subject?.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`;

      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toEmail,
          subject,
          htmlBody: `<div style="font-family:sans-serif; color:#334155; line-height:1.6; white-space:pre-wrap;">${replyText.replace(/\n/g, "<br/>")}</div><br/><hr style="border:none; border-top:1px solid #e2e8f0; margin:20px 0;"/><br/><div style="color:#64748b; font-size:13px;"><blockquote>${selectedEmail.htmlBody || selectedEmail.textBody}</blockquote></div>`,
          inReplyToId: selectedEmail.id,
        })
      });
      const data = await res.json();
      if (data.success) {
        setReplyText("");
        fetchEmails(); 
        setFilter('SENT');
      } else {
        alert("Erro ao enviar: " + data.error);
      }
    } catch (e) {
      alert("Erro na rede.");
    }
    setSending(false);
  };

  const handleSendNewEmail = async () => {
    if (!newEmail.to || !newEmail.subject || !newEmail.body) {
      alert("Por favor, preencha todos os campos.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: newEmail.to,
          subject: newEmail.subject,
          htmlBody: `<div style="font-family:sans-serif; color:#334155; line-height:1.6; white-space:pre-wrap;">${newEmail.body.replace(/\n/g, "<br/>")}</div>`,
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewEmail({ to: "", subject: "", body: "" });
        setIsComposing(false);
        fetchEmails();
        setFilter('SENT');
      } else {
        alert("Erro ao enviar: " + data.error);
      }
    } catch (e) {
      alert("Erro na rede.");
    }
    setSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-950 text-white font-sans">
      {/* Lista Laterial (Threads) */}
      <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-white/10 bg-slate-900/50 flex flex-col ${selectedEmail || isComposing ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/10 bg-slate-900/80">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2"><Mail className="text-indigo-400" /> E-mails</h2>
            <button onClick={fetchEmails} className="text-xs text-indigo-300 hover:text-white px-2 py-1 rounded bg-indigo-500/10">Atualizar</button>
          </div>

          <button 
            onClick={() => { setIsComposing(true); setSelectedEmail(null); }}
            className="w-full mb-4 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} /> Novo E-mail
          </button>
          
          {/* Tabs */}
          <div className="flex bg-slate-950/50 p-1 rounded-xl border border-white/5 space-x-1">
            <button 
              onClick={() => { setFilter('INBOX'); setIsComposing(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${filter === 'INBOX' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <Inbox size={12} /> Inbox
            </button>
            <button 
              onClick={() => { setFilter('SENT'); setIsComposing(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${filter === 'SENT' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <SendHorizontal size={12} /> Enviados
            </button>
            <button 
              onClick={() => { setFilter('SPAM'); setIsComposing(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-all ${filter === 'SPAM' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <ShieldAlert size={12} /> Spam
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-8 text-center text-slate-500 animate-pulse">Carregando mensagens...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 text-slate-600">
                {filter === 'INBOX' ? <Inbox size={32} /> : filter === 'SENT' ? <SendHorizontal size={32} /> : <ShieldAlert size={32} />}
              </div>
              <p className="text-sm text-slate-500 uppercase font-bold tracking-widest">Pasta Vazia</p>
            </div>
          ) : (
            filteredEmails.map(email => (
              <div 
                key={email.id} 
                onClick={() => { setSelectedEmail(email); setIsComposing(false); }}
                className={`p-4 border-b border-white/5 cursor-pointer transition-all relative ${selectedEmail?.id === email.id ? 'bg-indigo-500/10 border-l-4 border-l-indigo-500' : 'hover:bg-white/5'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-semibold text-sm truncate pr-2 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${email.status === 'SPAM' ? 'bg-orange-500' : email.direction === "OUTBOUND" ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                    {email.direction === "INBOUND" ? email.sender : `Para: ${email.recipient}`}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-600 flex-shrink-0">{new Date(email.createdAt).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'})}</div>
                </div>
                <div className="text-sm font-medium text-slate-200 truncate">{email.subject || '(Sem Assunto)'}</div>
                <div className="text-xs text-slate-500 truncate mt-1 leading-relaxed">
                   {email.textBody || email.htmlBody?.replace(/<[^>]+>/g, '').substring(0, 80).trim() || 'Visualizar conteúdo do e-mail...'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Visualizador / Compositor */}
      <div className={`w-full md:flex-1 flex flex-col bg-slate-950 ${(selectedEmail || isComposing) ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
        {isComposing ? (
          /* NOVO E-MAIL FORM */
          <div className="flex flex-col h-full bg-slate-950">
            <div className="p-6 border-b border-white/10 bg-slate-900/40">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsComposing(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors md:hidden"><ArrowLeft size={16} /></button>
                  <h1 className="text-2xl font-extrabold text-white flex items-center gap-3"><Plus className="text-indigo-400" /> Nova Mensagem</h1>
                </div>
                <button onClick={() => setIsComposing(false)} className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-full"><X size={24} /></button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/5 p-1 px-4 rounded-xl border border-white/5 focus-within:border-indigo-500/50 transition-all">
                  <span className="text-sm font-bold text-slate-500 w-12 text-right">PARA:</span>
                  <input 
                    type="email" 
                    placeholder="email@exemplo.com"
                    value={newEmail.to}
                    onChange={(e) => setNewEmail({...newEmail, to: e.target.value})}
                    className="flex-1 bg-transparent py-3 text-sm outline-none text-slate-200"
                  />
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-1 px-4 rounded-xl border border-white/5 focus-within:border-indigo-400/50 transition-all">
                  <span className="text-sm font-bold text-slate-500 w-12 text-right">ASSUNTO:</span>
                  <input 
                    type="text" 
                    placeholder="Qual o assunto da mensagem?"
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({...newEmail, subject: e.target.value})}
                    className="flex-1 bg-transparent py-3 text-sm outline-none text-slate-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              <textarea 
                placeholder="Escreva sua mensagem aqui..."
                value={newEmail.body}
                onChange={(e) => setNewEmail({...newEmail, body: e.target.value})}
                className="w-full h-full bg-transparent resize-none outline-none text-slate-300 leading-relaxed font-sans"
              />
            </div>

            <div className="p-6 border-t border-white/10 bg-slate-900/40 flex justify-end gap-4">
               <button 
                 onClick={() => setIsComposing(false)}
                 className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm"
               >
                 Descartar
               </button>
               <button 
                 onClick={handleSendNewEmail}
                 disabled={sending}
                 className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-xl shadow-indigo-500/10 flex items-center gap-2 active:scale-95"
               >
                 {sending ? 'Enviando...' : <><SendHorizonal size={18} /> Enviar Mensagem</>}
               </button>
            </div>
          </div>
        ) : !selectedEmail ? (
          /* EMPTY STATE */
          <div className="text-slate-700 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6">
               <Mail size={48} className="opacity-20" />
            </div>
            <p className="font-medium text-lg">Central de E-mails Admin</p>
            <p className="text-sm opacity-50">Selecione uma mensagem ou crie uma nova</p>
          </div>
        ) : (
          /* VISUALIZADOR E RESPOSTA */
          <>
            <div className="p-6 border-b border-white/10 bg-slate-900/40 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-6 md:hidden">
                 <button onClick={() => setSelectedEmail(null)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"><ArrowLeft size={16} /></button>
                 <span className="font-bold text-sm">Voltar para a lista</span>
              </div>
              
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">{selectedEmail.subject || '(Sem Assunto)'}</h1>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg ${selectedEmail.direction === 'INBOUND' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                      {(selectedEmail.direction === "INBOUND" ? selectedEmail.sender : selectedEmail.recipient).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-100 flex items-center gap-2">
                        {selectedEmail.direction === "INBOUND" ? selectedEmail.sender : 'Sistema RealStock (Auto)'}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${selectedEmail.status === 'SPAM' ? 'bg-orange-500' : selectedEmail.direction === 'INBOUND' ? 'bg-indigo-500' : 'bg-emerald-500'} text-white font-black`}>
                          {selectedEmail.status === 'SPAM' ? 'SPAM' : selectedEmail.direction}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {selectedEmail.direction === "INBOUND" ? 'Para: contato@realstock.com.br' : `Destinatário: ${selectedEmail.recipient}`}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                   {selectedEmail.status !== 'SPAM' ? (
                     <button 
                       onClick={() => handleUpdateStatus(selectedEmail.id, 'SPAM')}
                       className="p-3 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
                     >
                       <ShieldAlert size={16} /> Marcar como Spam
                     </button>
                   ) : (
                     <button 
                       onClick={() => handleUpdateStatus(selectedEmail.id, 'READ')}
                       className="p-3 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-bold"
                     >
                       <CheckCheck size={16} /> Não é Spam
                     </button>
                   )}
                   <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-white/40 flex items-center gap-1 font-black uppercase">
                        <Clock size={10} />
                        {new Date(selectedEmail.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto bg-[#020617] relative">
              <div className="max-w-4xl mx-auto bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden min-h-full">
                <div className="p-10">
                   <div 
                     dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody || `<div style="color:#cbd5e1; white-space:pre-wrap;">${selectedEmail.textBody || ''}</div>` }} 
                     className="email-content text-slate-300 text-sm leading-relaxed [&_a]:text-indigo-400 [&_a]:underline font-sans"
                   ></div>
                </div>
              </div>
            </div>

            {/* Area de Resposta */}
            <div className="p-4 border-t border-white/10 bg-slate-900/80">
              <div className="max-w-4xl mx-auto">
                <div className="bg-slate-950 rounded-2xl border border-white/10 p-4 focus-within:ring-2 focus-within:ring-indigo-500/30 transition-all">
                  <textarea 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Escreva uma resposta para ${selectedEmail.direction === "INBOUND" ? selectedEmail.sender : selectedEmail.recipient}...`}
                    className="w-full bg-transparent resize-none text-sm outline-none placeholder:text-slate-600 min-h-[100px] text-slate-200"
                  />
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                    <button 
                      onClick={() => setReplyText("")}
                      className="text-slate-500 hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-white/5"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button 
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                    >
                      {sending ? 'Enviando...' : <><Send size={16} /> Enviar Resposta</>}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        
        .email-content { font-family: 'Inter', sans-serif !important; }
        .email-content table { width: 100% !important; border-radius: 12px; border-collapse: separate !important; }
        .email-content img { max-width: 100% !important; border-radius: 12px; height: auto !important; }
      `}</style>
    </div>
  );
}
