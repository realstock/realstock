import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-slate-950 text-slate-400 py-12 pb-24 px-6">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="space-y-4 sm:col-span-2 lg:col-span-1">
          <Link href="/" className="block w-[180px]">
             <Image
                src="/logo-realstock.jpg"
                alt="RealStock"
                width={300}
                height={80}
                className="w-full h-auto"
              />
          </Link>
          <p className="text-sm leading-relaxed">
            Marketplace imobiliário inteligente. Conectamos proprietários, corretores e compradores com negociação em tempo real, sem burocracia e com total segurança.
          </p>
        </div>

        {/* Modalidades de Imóveis */}
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Modalidades</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/imoveis-a-venda" className="hover:text-white transition-colors">Imóveis à Venda</Link></li>
            <li><Link href="/aluguel-temporada" className="hover:text-white transition-colors">Aluguel por Temporada</Link></li>
            <li><Link href="/anuncios-turbinados" className="hover:text-white transition-colors">Vitrine de Destaques</Link></li>
            <li><Link href="/anunciar" className="hover:text-white transition-colors">Anunciar Imóvel Grátis</Link></li>
            <li><Link href="/instrucoes" className="hover:text-white transition-colors">Como funciona o portal?</Link></li>
          </ul>
        </div>

        {/* Cidades e Destinos Populares */}
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Destinos em Alta</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/imoveis/fortaleza" className="hover:text-white transition-colors">Imóveis em Fortaleza (CE)</Link></li>
            <li><Link href="/imoveis/eusebio" className="hover:text-white transition-colors">Imóveis em Eusébio (CE)</Link></li>
            <li><Link href="/imoveis/trairi" className="hover:text-white transition-colors">Temporada em Trairi / Flecheiras (CE)</Link></li>
            <li><Link href="/imoveis/vitoria" className="hover:text-white transition-colors">Imóveis em Vitória (ES)</Link></li>
            <li><Link href="/imoveis/conceicao-da-barra" className="hover:text-white transition-colors">Imóveis em Conceição da Barra (ES)</Link></li>
          </ul>
        </div>

        {/* Transparência & Legal */}
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Institucional</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/quem-somos" className="hover:text-white transition-colors">Quem Somos (A Empresa)</Link></li>
            <li><Link href="/termos" className="hover:text-white transition-colors">Termos de Uso do Site</Link></li>
            <li><Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
            <li><a href="mailto:contato@realstock.com.br" className="hover:text-white transition-colors">Central de Atendimento</a></li>
          </ul>
        </div>

        {/* Creci & Pagamentos */}
        <div>
           <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Atendimento</h4>
           <p className="text-sm mb-1">E-mail: contato@realstock.com.br</p>
           <p className="text-xs text-slate-500">Parceiros e anunciantes em todo o Brasil.</p>
           <div className="mt-4 inline-block bg-slate-900 border border-white/5 py-2.5 px-3 rounded-xl">
             <div className="text-[11px] uppercase font-bold text-white mb-1">Pagamentos Seguros</div>
             <div className="flex gap-2 items-center">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 opacity-70" />
                 <span className="text-[10px] text-slate-400">Cartão de Crédito e Pix</span>
             </div>
           </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto mt-10 pt-6 border-t border-white/5 text-xs text-slate-500 leading-relaxed">
        <p>
          O <strong>RealStock</strong> é a plataforma de anúncios e intermediação direta de imóveis para compra, venda e aluguel de temporada. Anuncie direto com o proprietário ou encontre apartamentos, casas de praia, condomínios e terrenos com livro de ofertas e reservas transparentes.
        </p>
      </div>
    </footer>
  );
}
