import React from "react";
import Link from "next/link";
import { Building2, Rocket, ShieldCheck, Megaphone } from "lucide-react";

export const metadata = {
  title: "Quem Somos | RealStock",
  description: "Conheça a história e a missão da RealStock, o melhor marketplace para negociação imobiliária rápida e segura.",
};

export default function QuemSomosPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-300 py-12 px-6">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Sobre a RealStock
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Nascemos para descomplicar a jornada de compra e venda de imóveis no Brasil, 
            utilizando tecnologia e transparência a favor dos bons negócios.
          </p>
        </div>

        {/* Origin Content */}
        <div className="bg-slate-900 border border-white/10 rounded-[28px] p-8 md:p-12 shadow-2xl space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4">A Nossa História</h2>
          <p className="leading-relaxed">
            A <strong>RealStock</strong> começou através da identificação de um problema estrutural muito grave no mercado imobiliário da América Latina: a lentidão e a obscuridade entre os catálogos dos imóveis anunciados na internet e a realidade para a aquisição da posse dessas propriedades. Muitas vezes os compradores enfrentavam burocracias ou informações falsas.
          </p>
          <p className="leading-relaxed">
            Nossa plataforma foi desenvolvida do zero para conectar, de maneira fluída e sem barreiras ocultas, o proprietário ou corretor oficial e parceiro diretamente à ponta final do investidor, reduzindo o trânsito de documentações terceirizadas e concentrando em uma interface simples todo o ecossistema e visualização de prospecções. 
          </p>
        </div>

        {/* AdTech Hub */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-[28px] p-8 md:p-12 shadow-2xl space-y-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
            <span className="bg-blue-500/20 p-2 rounded-xl"><Megaphone className="w-6 h-6 text-blue-400" /></span>
            Primeira AdTech Imobiliária Autônoma
          </h2>
          <p className="leading-relaxed">
            Muito além de uma vitrine virtual, a <strong>RealStock</strong> evoluiu para se tornar um ecossistema 100% autônomo de publicidade (AdTech). Nós substituímos o complexo e custoso trabalho manual das agências de marketing ao integrarmos a nossa arquitetura diretamente com as APIs Oficiais do <strong>Google Ads</strong> e da <strong>Meta (Facebook & Instagram)</strong>.
          </p>
          <p className="leading-relaxed">
            Com apenas um clique e um pagamento seguro transparente via PayPal, o nosso servidor constrói instantaneamente toda a estrutura hierárquica de tráfego pago nos bastidores — orçamentos matemáticos, grupos de anúncios segmentados, lances de Inteligência Artificial e a evasão de malhas de restrições de marketing. Seu imóvel alcança o topo do mundo online na velocidade de um clique, exibindo 100% dos relatórios (Insights) de cliques integrados dentro do seu próprio painel corporativo.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
            <Rocket className="w-10 h-10 text-sky-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Velocidade</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Integração completa com as redes sociais. Diferente da maioria dos balcões de anúncios orgânicos, nós oferecemos a possibilidade de impulsionar o seu portfólio instantaneamente via Instagram e Google.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
            <Building2 className="w-10 h-10 text-pink-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Autonomia</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Você detém o poder da sua negociação. Ferramentas emuladas que funcionam exatamente como um Home Broker da Bolsa, permitindo o recebimento de ofertas de propostas oficiais de investidores e recusas.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-colors">
            <ShieldCheck className="w-10 h-10 text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Transparência</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Verificações rígidas do status legal dos imóveis e dados cruzados evitam surpresas de última hora na mesa do Tabilionato, garantindo aos compradores uma liquidez mais segura em ativos tijolo.
            </p>
          </div>
        </div>

        {/* Mission / Contact CTA */}
        <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-[28px] p-8 md:p-12 text-center md:text-left md:flex items-center justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-white mb-3">Nossa Missão</h2>
            <p className="text-slate-300 leading-relaxed text-sm">
              Consolidar o maior banco de capital real e digital (Real Stock) de propriedades disponíveis, transformando a aquisição habitacional numa experiência simples, confiável e tecnológica. Dúvidas sobre o projeto ou desejo de firmar parceria? Entre em contato e vamos conversar.
            </p>
          </div>
          <div className="mt-8 md:mt-0">
             <a href="mailto:contato@realstock.com.br" className="inline-block bg-white text-slate-950 font-bold px-8 py-4 rounded-xl hover:bg-slate-200 transition-colors whitespace-nowrap">
               Falar com a Equipe
             </a>
          </div>
        </div>

      </div>
    </main>
  );
}
