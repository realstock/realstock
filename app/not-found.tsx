import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 space-y-6 max-w-md">
        <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-600">
          404
        </h1>
        <h2 className="text-2xl font-bold text-white">
          Página não encontrada
        </h2>
        <p className="text-slate-400">
          O imóvel ou a página que você está procurando pode ter sido removido, teve seu nome alterado ou está temporariamente indisponível.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
          >
            <Home size={20} />
            Página Inicial
          </Link>
          
          <Link 
            href="/ofertas"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all"
          >
            <Search size={20} />
            Ver Imóveis
          </Link>
        </div>
      </div>
    </div>
  );
}
