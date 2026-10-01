import Image from "next/image";

export default function FixedFooter() {
  return (
    <footer className="fixed bottom-0 left-0 w-full border-t border-white/10 bg-slate-950/95 backdrop-blur z-40">
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 px-6 py-2.5 text-xs text-slate-400">
        <div>
          © {new Date().getFullYear()} RealStock. Todos os direitos reservados. Plataforma de anúncios imobiliários.
        </div>

        {/* Bandeira do Ceará e Do Ceará mesmo entre a frase e o contato */}
        <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
          <div className="relative w-5 h-3.5 rounded-[2px] overflow-hidden shadow-sm shrink-0 border border-white/20">
            <Image
              src="/bandeira-ceara.svg"
              alt="Bandeira do Ceará"
              width={20}
              height={14}
              className="w-full h-full object-cover"
            />
          </div>
          <span>Do Ceará mesmo</span>
        </div>

        <a
          href="mailto:contato@realstock.com.br"
          className="text-slate-300 transition hover:text-white"
        >
          Contato
        </a>
      </div>
    </footer>
  );
}
