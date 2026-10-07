import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "RealStock | Imóveis à Venda e Aluguel por Temporada no Brasil",
  description:
    "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores no RealStock. Negociação e reservas em tempo real com segurança.",
  alternates: {
    canonical: "https://www.realstock.com.br",
  },
  openGraph: {
    title: "RealStock | Imóveis à Venda e Aluguel por Temporada no Brasil",
    description:
      "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores no RealStock. Negociação e reservas em tempo real com segurança.",
    url: "https://www.realstock.com.br",
    type: "website",
    locale: "pt_BR",
    siteName: "RealStock",
    images: [
      {
        url: "https://www.realstock.com.br/icon.png",
        width: 512,
        height: 512,
        alt: "RealStock - Marketplace de Imóveis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RealStock | Imóveis à Venda e Aluguel por Temporada",
    description:
      "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores.",
    images: ["https://www.realstock.com.br/icon.png"],
  },
};

export default function HomePage() {
  return <HomeClient />;
}
