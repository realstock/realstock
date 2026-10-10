import Link from "next/link";
import {
  Building2,
  Calendar,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Search,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomeSeoHub() {
  const destinations = [
    {
      name: "Fortaleza (CE)",
      slug: "fortaleza",
      desc: "Apartamentos na Beira-Mar, Meireles, Aldeota e opções para temporada no litoral cearense.",
    },
    {
      name: "Eusébio (CE)",
      slug: "eusebio",
      desc: "Casas modernas em condomínios fechados com infraestrutura completa de lazer e segurança.",
    },
    {
      name: "Trairi / Flecheiras (CE)",
      slug: "trairi",
      desc: "Casas de praia, vilas de veraneio e points internacionais para prática de kitesurf e descanso.",
    },
    {
      name: "Vitória (ES)",
      slug: "vitoria",
      desc: "Apartamentos e imóveis de alto padrão na capital capixaba com excelente qualidade de vida.",
    },
    {
      name: "Conceição da Barra (ES)",
      slug: "conceicao-da-barra",
      desc: "Destino tradicional de veraneio no litoral norte do Espírito Santo, praias e descanso.",
    },
  ];

  return (
    <section className="mx-auto max-w-[1600px] px-6 py-12 border-t border-white/10 mt-12">
      <h1 className="sr-only">RealStock | Imóveis à Venda e Aluguel por Temporada no Brasil</h1>


      {/* Grid de Modalidades Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {/* Card Compra e Venda */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-950 p-8 flex flex-col justify-between hover:border-blue-500/40 transition-all duration-300">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Building2 size={14} /> Compra e Venda
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Imóveis à Venda no Brasil
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Apartamentos, casas em condomínio, coberturas e terrenos. Negocie direto com os proprietários através de um livro de ofertas transparente, envie contrapropostas e encontre o imóvel ideal com localização exata e dados detalhados.
            </p>
          </div>
          <Link
            href="/imoveis-a-venda"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 group"
          >
            <span>Explorar catálogo de imóveis à venda</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Card Aluguel de Temporada */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-950 p-8 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Calendar size={14} /> Férias & Temporada
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Aluguel por Temporada
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Casas de praia, chalés, flats e acomodações aconchegantes nos principais pontos turísticos do Brasil. Calendário em tempo real, cálculo transparente de diárias e reservas sem taxas ocultas abusivas.
            </p>
          </div>
          <Link
            href="/aluguel-temporada"
            className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 group"
          >
            <span>Ver casas e flats para temporada</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Cidades e Destinos Populares */}
      <div className="mb-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <MapPin size={22} className="text-emerald-400" /> Cidades com Imóveis em Destaque
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Navegue pelos principais mercados imobiliários e regiões turísticas atendidas pelo RealStock.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {destinations.map((d) => (
            <Link
              key={d.slug}
              href={`/imoveis/${d.slug}`}
              className="group p-5 rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {d.name}
                  </h3>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {d.desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
                <span>Ver imóveis nesta cidade</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Diferenciais da Plataforma */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-8 md:p-12 mb-16">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
            A Nova Maneira de Negociar Imóveis
          </h2>
          <p className="text-slate-400 text-sm">
            Criado para aproximar compradores, hóspedes e proprietários com tecnologia de ponta e autonomia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <TrendingUp size={22} />
            </div>
            <h3 className="text-lg font-bold text-white">Livro de Ofertas Transparente</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              O comprador envia ofertas online com clareza. O proprietário avalia, aceita ou contrapropõe sem burocracia demorada.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calendar size={22} />
            </div>
            <h3 className="text-lg font-bold text-white">Aluguel por Temporada sem Travas</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sincronização com calendários mundiais (iCal e Google Vacation Rentals) e fluxo direto de pré-reserva com pagamento seguro via Pix.
            </p>
          </div>

          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ShieldCheck size={22} />
            </div>
            <h3 className="text-lg font-bold text-white">Anúncios Turbinados com IA</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Dispare campanhas automáticas de alta performance no Instagram, Facebook e Google para atrair compradores qualificados em dias.
            </p>
          </div>
        </div>
      </div>

    </section>
  );
}
