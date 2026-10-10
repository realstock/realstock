import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { HelpCircle, ChevronRight, Home, ArrowRight, Search, PlusCircle, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Dúvidas Frequentes (FAQ) | RealStock",
  description:
    "Respostas para as principais perguntas sobre compra, venda, aluguel de temporada e anúncios no RealStock.",
  alternates: {
    canonical: "https://www.realstock.com.br/duvidas-frequentes",
  },
  openGraph: {
    title: "Dúvidas Frequentes (FAQ) | RealStock",
    description:
      "Respostas para as principais perguntas sobre compra, venda, aluguel de temporada e anúncios no RealStock.",
    url: "https://www.realstock.com.br/duvidas-frequentes",
    type: "website",
    locale: "pt_BR",
    siteName: "RealStock",
    images: [
      {
        url: "https://www.realstock.com.br/icon.png",
        width: 512,
        height: 512,
        alt: "RealStock - Dúvidas Frequentes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dúvidas Frequentes (FAQ) | RealStock",
    description:
      "Respostas para as principais perguntas sobre compra, venda, aluguel de temporada e anúncios no RealStock.",
    images: ["https://www.realstock.com.br/icon.png"],
  },
};

const faqList = [
  {
    q: "O que é o RealStock e como funciona?",
    a: "O RealStock é um marketplace imobiliário autônomo que conecta proprietários, corretores e compradores diretamente. Diferente de portais convencionais, o RealStock possui livro de ofertas em tempo real para compra e venda, além de integração de aluguel por temporada sincronizada com Google Vacation Rentals, Airbnb e Booking.",
  },
  {
    q: "Como encontrar imóveis à venda ou para alugar por temporada?",
    a: "Você pode navegar pelo mapa 3D interativo ou acessar diretamente as categorias exclusivas: 'Imóveis à Venda' para compra definitiva ou 'Aluguel por Temporada' para estadias de férias e trabalho. Também é possível filtrar por cidades como Fortaleza, Eusébio, Vitória e Conceição da Barra.",
  },
  {
    q: "Como enviar uma proposta no livro de ofertas?",
    a: "Na página de qualquer imóvel à venda, basta acessar a aba de ofertas e informar o valor que deseja propor. A negociação é transparente, permitindo que comprador e vendedor ajustem condições rapidamente sem burocracia desnecessária.",
  },
  {
    q: "Como funciona a reserva de aluguel por temporada?",
    a: "Escolha as datas de check-in e check-out na página do imóvel. O cálculo do valor total e das diárias é feito automaticamente. Envie sua solicitação de reserva e, após aprovação do anfitrião, efetue o pagamento com garantia e segurança.",
  },
  {
    q: "Como anunciar meu imóvel no RealStock?",
    a: "O cadastro é simples e gratuito. Clique em 'Anunciar imóvel' no menu, preencha as características, envie fotos e publique. Você também pode ativar campanhas de turbinamento inteligente para veicular anúncios automáticos no Instagram, Facebook e Google.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqList.map((item) => ({
    "@type": "Question",
    "name": item.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": item.a,
    },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Início",
      "item": "https://www.realstock.com.br",
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Dúvidas Frequentes",
      "item": "https://www.realstock.com.br/duvidas-frequentes",
    },
  ],
};

export default function DuvidasFrequentesPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 mb-8">
          <Link href="/" className="hover:text-white transition-colors flex items-center gap-1">
            <Home size={14} /> Início
          </Link>
          <ChevronRight size={14} className="text-slate-600" />
          <span className="text-blue-400 font-medium">Dúvidas Frequentes</span>
        </nav>

        {/* Header */}
        <header className="mb-12 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
            <HelpCircle size={14} /> Central de Ajuda
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight mb-4">
            Dúvidas Frequentes sobre o RealStock
          </h1>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl">
            Respostas para as principais perguntas sobre compra, venda, aluguel de temporada e anúncios.
          </p>
        </header>

        {/* Lista de FAQs */}
        <div className="space-y-6">
          {faqList.map((item, index) => (
            <article
              key={index}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-7 hover:border-blue-500/30 transition-all duration-300 shadow-lg"
            >
              <h2 className="text-lg sm:text-xl font-bold text-white mb-3 flex items-start gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold mt-0.5">
                  {index + 1}
                </span>
                <span>{item.q}</span>
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed pl-10">
                {item.a}
              </p>
            </article>
          ))}
        </div>

        {/* Links Rápidos / Ações */}
        <div className="mt-14 pt-10 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/"
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900 hover:border-blue-500/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Search size={18} className="text-blue-400" />
              <span className="text-sm font-semibold text-white">Pesquisar Imóveis</span>
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/anunciar"
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900 hover:border-blue-500/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <PlusCircle size={18} className="text-emerald-400" />
              <span className="text-sm font-semibold text-white">Anunciar Imóvel</span>
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/instrucoes"
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900 hover:border-blue-500/40 transition-all group"
          >
            <div className="flex items-center gap-3">
              <BookOpen size={18} className="text-amber-400" />
              <span className="text-sm font-semibold text-white">Como Funciona</span>
            </div>
            <ArrowRight size={16} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </main>
  );
}
