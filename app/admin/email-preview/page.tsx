"use client";

import { Mail, Zap, Gift, Users, Rocket, ExternalLink, Copy } from "lucide-react";

export default function EmailPreviewPage() {
  const referralLink = "https://realstock.com.br/cadastro?ref=LEO-1";

  return (
    <div className="min-h-screen bg-slate-900 p-8 flex flex-col items-center">
      <div className="mb-8 text-center">
         <div className="text-purple-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center justify-center gap-2">
            <Mail size={16} /> Pré-visualização de E-mail
         </div>
         <h1 className="text-white text-3xl font-black uppercase italic tracking-tighter">Comunicado Especial: Rede Viralizar</h1>
      </div>

      {/* TEMPLATE DO EMAIL */}
      <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
         {/* HEADER */}
         <div className="bg-slate-950 p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" />
            <div className="relative z-10">
               <img src="/logo.png" alt="RealStock" className="h-12 mx-auto mb-8 invert" />
               <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none mb-4">Você Ganhou um Presente de R$ 625,00! 🎁</h2>
               <p className="text-slate-400 text-lg italic">Seja bem-vindo à nova era do Marketing Imobiliário.</p>
            </div>
         </div>

         {/* BODY */}
         <div className="p-10 text-slate-800 leading-relaxed">
            <p className="text-xl font-bold mb-6">Olá, Corretor!</p>
            
            <p className="mb-6">
               O RealStock acaba de lançar o **Comando Viralizar**, a ferramenta de inteligência artificial mais poderosa para automação de redes sociais do Brasil, e nós decidimos que você será um dos primeiros a dominar essa tecnologia.
            </p>

            <div className="bg-purple-50 p-8 rounded-[32px] border border-purple-100 mb-8">
               <div className="flex items-start gap-4">
                  <div className="bg-purple-600 p-3 rounded-2xl text-white">
                     <Gift size={24} />
                  </div>
                  <div>
                     <h3 className="text-lg font-black uppercase text-purple-900 mb-2">Seu Saldo de Boas-Vindas</h3>
                     <p className="text-purple-800 font-medium">Creditamos agora na sua conta **5 CUPONS GRATUITOS** para você viralizar seus imóveis.</p>
                     <p className="text-purple-600 text-sm mt-2 italic">Cada cupom equivale a um pacote completo: Vídeo IA + Postagens no IG e FB.</p>
                  </div>
               </div>
            </div>

            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-slate-900 flex items-center gap-2">
               <Zap className="text-amber-500" /> Como Funciona o Viralizar?
            </h3>
            <p className="mb-4">
               Com um único clique, nossa IA transforma as fotos do seu imóvel em um **Vídeo Reels Profissional** com trilha sonora e efeitos, e publica automaticamente no **Instagram e Facebook oficiais da RealStock**.
            </p>
            <p className="mb-8 font-bold text-slate-900 border-l-4 border-emerald-500 pl-4 py-1 bg-emerald-50/50">
               Além de figurar em nossas redes, este serviço deixa o seu anúncio **100% preparado** para receber impulsionamentos da Meta e do Google Ads. Tudo isso é feito através de um único clique dentro do nosso site, colocando seu imóvel na frente de milhares de compradores interessados.
            </p>

            <div className="border-t border-slate-100 pt-8 mb-8">
               <h3 className="text-xl font-black uppercase italic tracking-tighter mb-4 text-slate-900 flex items-center gap-2">
                  <Users className="text-indigo-600" /> Ganhe Mais sem Pagar Nada!
               </h3>
               <p className="mb-6 italic">
                  Gostou dos 5 cupons? Você pode ter **cupons infinitos**. Para cada corretor que se cadastrar no RealStock usando seu link exclusivo, você ganha **+5 CRÉDITOS** e ele também ganha 5!
               </p>
               
               <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Seu Link de Convite Único</span>
                     <code className="text-indigo-600 font-bold">{referralLink}</code>
                  </div>
                  <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all">
                     Copiar Link
                  </button>
               </div>
            </div>

            <div className="text-center mt-12">
               <a href="https://realstock.com.br/minha-conta/anuncios?viralizar=true" className="inline-block bg-slate-950 text-white px-12 py-6 rounded-[24px] font-black text-lg uppercase tracking-widest shadow-2xl shadow-slate-400 hover:scale-105 transition-all">
                  Usar Meus Créditos Agora 🚀
               </a>
            </div>
         </div>

         {/* FOOTER */}
         <div className="bg-slate-50 p-8 text-center text-slate-400 text-xs border-t border-slate-100">
            <p className="mb-2">© 2026 RealStock - Inteligência Artificial para o Mercado Imobiliário</p>
            <p>Você recebeu este e-mail porque é um usuário cadastrado no RealStock.</p>
         </div>
      </div>
      
      <div className="mt-8 text-slate-500 text-sm italic max-w-lg text-center">
         Dica: Este template usa o sistema de cores premium do site para manter a autoridade da marca.
      </div>
    </div>
  );
}
