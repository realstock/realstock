"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, UserPlus, TrendingUp, Search, Network, ChevronRight, ChevronDown, ChevronLeft, User as UserIcon, Mail, Send, X } from "lucide-react";

interface NetworkUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  referrerId: number | null;
  viralizarCredits: number;
  referralCode: string | null;
  createdAt: string;
}

interface TreeNodeData extends NetworkUser {
  children: TreeNodeData[];
}

export default function AdminNetworkPage() {
  const [users, setUsers] = useState<NetworkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Estados do Modal de E-mail
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("both");
  const [emailSubject, setEmailSubject] = useState("Você Ganhou um Presente de R$ 625,00! 🎁");
  const [emailHtml, setEmailHtml] = useState(`
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; color: #334155;">
  <div style="background: #020617; padding: 40px; text-align: center;">
    <h2 style="color: white; font-size: 28px; font-weight: 900; margin-bottom: 10px; text-transform: uppercase; font-style: italic;">Você Ganhou um Presente de R$ 625,00! 🎁</h2>
    <p style="color: #94a3b8; font-size: 16px;">Marketing Viral RealStock</p>
  </div>
  <div style="padding: 40px;">
    <p style="font-size: 18px; font-weight: bold;">Olá, [NOME]!</p>
    <p>O RealStock acaba de lançar o <b>Comando Viralizar</b>, e creditamos agora na sua conta <b>5 CUPONS GRATUITOS</b>.</p>
    <p style="background: #f8fafc; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; font-weight: bold;">
      Este serviço publica automaticamente no Instagram e Facebook oficiais da RealStock e deixa seu anúncio pronto para o Google e Meta Ads.
    </p>
    <p>Ganhe +5 cupons para cada colega que se cadastrar pelo seu link:</p>
    <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; text-align: center; font-family: monospace; font-weight: bold; color: #4f46e5; margin-bottom: 30px;">
      [REF_LINK]
    </div>
    <div style="text-align: center;">
      <a href="https://realstock.com.br/minha-conta/anuncios?viralizar=true" style="background: #0f172a; color: white; padding: 18px 35px; border-radius: 16px; text-decoration: none; font-weight: 900; text-transform: uppercase; display: inline-block; white-space: nowrap; font-size: 14px;">Usar Meus Créditos Agora 🚀</a>
    </div>
  </div>
</div>
  `);

  useEffect(() => {
    fetch("/api/admin/network-tree")
      .then(res => res.json())
      .then(data => {
        if (data.success) setUsers(data.users);
        setLoading(false);
      });
  }, []);

  const handleSendEmail = async () => {
    if (!confirm(`Deseja disparar este e-mail para todos os ${users.length} usuários?`)) return;
    
    setSending(true);
    try {
      const res = await fetch("/api/admin/broadcast-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, htmlContent: emailHtml, channel })
      });
      const data = await res.json();
      if (data.success) {
        alert("Disparo concluído com sucesso!");
        setIsEmailModalOpen(false);
      } else {
        alert("Erro: " + data.error);
      }
    } catch (e) {
      alert("Erro ao disparar e-mails.");
    } finally {
      setSending(false);
    }
  };

  const buildTree = (parentId: number | null = null): TreeNodeData[] => {
    return users
      .filter(u => u.referrerId === parentId)
      .map(user => ({
        ...user,
        children: buildTree(user.id)
      }));
  };

  const tree = buildTree(null); 

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-950 text-white">Carregando Rede...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 relative">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <Link 
              href="/admin"
              className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest mb-6 group"
            >
               <div className="bg-white/5 p-2 rounded-lg group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-all">
                  <ChevronLeft size={14} />
               </div>
               Voltar ao Painel
            </Link>

            <div className="flex items-center gap-3 text-purple-400 mb-2 font-black tracking-widest uppercase text-xs">
              <Network size={16} /> Administrativo de Expansão
            </div>
            <h1 className="text-5xl font-black tracking-tighter uppercase italic">Árvore de Crescimento</h1>
          </div>
          
          <div className="flex gap-4 items-center">
             <button 
               onClick={() => setIsEmailModalOpen(true)}
               className="bg-white text-slate-950 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-purple-400 hover:text-white transition-all shadow-xl shadow-white/5"
             >
                <Send size={16} /> Comunicar Rede
             </button>

             <div className="bg-slate-900 border border-white/5 p-4 rounded-2xl flex flex-col min-w-[120px]">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total Usuários</span>
                <span className="text-2xl font-black">{users.length}</span>
             </div>
             <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex flex-col text-emerald-400 min-w-[120px]">
                <span className="text-[10px] font-bold uppercase tracking-widest">Créditos em Circulação</span>
                <span className="text-2xl font-black">{users.reduce((acc, u) => acc + u.viralizarCredits, 0)}</span>
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8">
          {/* VISUALIZAÇÃO DA REDE */}
          <div className="bg-slate-900/50 border border-white/5 rounded-[40px] p-8 backdrop-blur-xl">
             <h2 className="text-xl font-black mb-8 uppercase italic flex items-center gap-3">
               <Users className="text-purple-500" /> Estrutura de Indicações
             </h2>
             
             <div className="space-y-4">
                {tree.map(node => (
                   <TreeNode key={node.id} node={node} level={0} />
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* MODAL DE COMUNICAÇÃO */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
           <div className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-950">
                  <div>
                    <h2 className="text-2xl font-black uppercase italic tracking-tight">Comunicar Rede</h2>
                    <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-bold">Enviar comunicado para todos os corretores ativos</p>
                 </div>
                 <button onClick={() => setIsEmailModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X size={32} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Canal de Envio</label>
                        <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
                            <button 
                                onClick={() => setChannel("email")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${channel === 'email' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Mail size={14} /> E-mail
                            </button>
                            <button 
                                onClick={() => setChannel("whatsapp")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${channel === 'whatsapp' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Send size={14} /> WhatsApp
                            </button>
                            <button 
                                onClick={() => setChannel("both")}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${channel === 'both' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                <Users size={14} /> Ambos
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Assunto do Comunicado</label>
                        <input 
                            type="text" 
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white font-bold outline-none focus:border-purple-500 transition-all"
                        />
                    </div>
                  </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* EDITOR */}
                    <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Conteúdo HTML (Editável)</label>
                       <textarea 
                         value={emailHtml}
                         onChange={(e) => setEmailHtml(e.target.value)}
                         className="w-full h-[400px] bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-slate-300 font-mono text-xs outline-none focus:border-purple-500 transition-all resize-none"
                       />
                       <div className="mt-3 p-4 bg-purple-500/10 rounded-xl text-[10px] text-purple-300 leading-relaxed uppercase font-black tracking-tighter">
                          Dica: Use <b>[NOME]</b> para o nome do corretor e <b>[REF_LINK]</b> para o link de convite único.
                       </div>
                    </div>

                    {/* PREVIEW */}
                    <div className="hidden lg:flex flex-col">
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Pré-visualização Real</label>
                       <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-inner border border-white/10 p-4">
                          <div className="h-full overflow-y-auto custom-scrollbar bg-white">
                             <div dangerouslySetInnerHTML={{ __html: emailHtml.replace(/\[NOME\]/g, "Corretor Exemplo").replace(/\[REF_LINK\]/g, "https://realstock.com.br/cadastro?ref=EXEMPLO") }} />
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 bg-slate-950 border-t border-white/5 flex justify-end gap-4">
                 <button 
                   onClick={() => setIsEmailModalOpen(false)}
                   className="px-8 py-4 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all"
                 >
                    Cancelar
                 </button>
                 <button 
                    onClick={handleSendEmail}
                    disabled={sending}
                    className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 disabled:opacity-50 ${channel === 'whatsapp' ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20' : 'bg-purple-500 hover:bg-purple-400 shadow-purple-500/20'} text-white`}
                  >
                    {sending ? "Enviando..." : `Disparar via ${channel === 'both' ? 'Multicanal' : channel.toUpperCase()}`} <Send size={18} />
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, level }: { node: any; level: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="relative">
      {/* LINHA VERTICAL PARA CONECTAR FILHOS */}
      {level > 0 && (
        <div 
          className="absolute border-l-2 border-white/10" 
          style={{ 
            left: `${(level - 1) * 32 + 16}px`, 
            top: '-16px', 
            bottom: '50%' 
          }} 
        />
      )}
      {/* LINHA HORIZONTAL PARA O CARD */}
      {level > 0 && (
        <div 
          className="absolute border-t-2 border-white/10" 
          style={{ 
            left: `${(level - 1) * 32 + 16}px`, 
            top: '24px', 
            width: '16px' 
          }} 
        />
      )}

      <div 
        className={`flex items-center gap-3 p-3 rounded-xl transition-all border group relative z-10 ${
            level === 0 ? 'bg-purple-500/20 border-purple-500/40 w-fit min-w-[280px]' : 'bg-white/5 border-white/5 hover:bg-white/10 w-fit min-w-[260px]'
        }`}
        style={{ marginLeft: `${level * 32}px` }}
      >
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className={`flex items-center justify-center h-6 w-6 rounded-full bg-slate-800 border border-white/10 transition-colors hover:bg-purple-500 ${hasChildren ? 'opacity-100' : 'opacity-0 cursor-default'}`}
        >
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        
        <div className="h-8 w-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {node.avatar ? <img src={node.avatar} className="w-full h-full object-cover" /> : <UserIcon size={14} className="text-slate-500" />}
        </div>

        <div className="flex-1 pr-4">
          <div className="text-[11px] font-black uppercase italic tracking-tight leading-none mb-1">{node.name}</div>
          <div className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{node.referralCode}</div>
        </div>

        <div className="flex items-center gap-4 shrink-0 border-l border-white/10 pl-4">
           <div className="text-right">
              <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Saldo</div>
              <div className="text-xs font-black text-emerald-400 leading-none">{node.viralizarCredits}</div>
           </div>
           {hasChildren && (
             <div className="bg-purple-500/10 px-2 py-1 rounded-md text-[8px] font-black text-purple-400 uppercase tracking-widest border border-purple-500/20">
               {node.children.length}
             </div>
           )}
        </div>
      </div>
      
      {isOpen && hasChildren && (
        <div className="mt-2 space-y-2">
          {node.children.map((child: any) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
