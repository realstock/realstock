import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-slate-950 text-slate-400 py-12 px-6">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
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
            A conexão perfeita entre imobiliárias, proprietários independentes e investidores. Transformando o mercado imobiliário com agilidade e inteligência tecnológica.
          </p>
        </div>

        {/* Links Principais */}
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Navegação</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="hover:text-white transition-colors">Início</Link></li>
            <li><Link href="/anunciar" className="hover:text-white transition-colors">Anunciar Imóvel</Link></li>
            <li><Link href="/anuncios-turbinados" className="hover:text-white transition-colors">Vitrine de Destaques</Link></li>
            <li><Link href="/instrucoes" className="hover:text-white transition-colors">Como funciona o portal?</Link></li>
          </ul>
        </div>

        {/* Transparência & Legal */}
        <div>
          <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Transparência</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/quem-somos" className="hover:text-white transition-colors">Quem Somos (A Empresa)</Link></li>
            <li><Link href="/termos" className="hover:text-white transition-colors">Termos de Uso do Site</Link></li>
            {/* The privacy policy link doesn't officially exist yet, but it's good practice to display it  */}
            <li><Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
            <li><a href="mailto:contato@realstock.com.br" className="hover:text-white transition-colors">Central de Atendimento</a></li>
          </ul>
        </div>

        {/* Creci & Contatos */}
        <div>
           <h4 className="text-white font-bold mb-4 uppercase text-xs tracking-widest">Atendimento</h4>
           <p className="text-sm mb-2">E-mail: contato@realstock.com.br</p>
           <p className="text-sm">Parceiros em todas as regiões do Brasil.</p>
           <div className="mt-4 inline-block bg-slate-900 border border-white/5 py-2 px-3 rounded-lg">
             <div className="text-xs uppercase font-bold text-white mb-1">Pagamentos Seguros por</div>
             <div className="flex gap-2 items-center">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 opacity-70" />
                 <span className="text-[10px] text-slate-500">Cartão de Crédito e Pix</span>
             </div>
           </div>
        </div>
      </div>
      
      <div className="mt-12 pt-6 border-t border-white/5 text-center text-xs text-slate-500 max-w-[1600px] mx-auto">
        &copy; {new Date().getFullYear()} RealStock Intermediações Imobiliárias. Todos os direitos reservados.
      </div>
    </footer>
  );
}
