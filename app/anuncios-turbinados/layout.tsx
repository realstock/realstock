import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vitrine em Alta - Anúncios Turbinados | RealStock",
  description:
    "Confira os imóveis em destaque turbinados no Google Ads e Meta Ads com máxima visibilidade e engajamento no RealStock.",
  alternates: {
    canonical: "https://www.realstock.com.br/anuncios-turbinados",
  },
  openGraph: {
    title: "Vitrine em Alta - Anúncios Turbinados | RealStock",
    description:
      "Confira os imóveis em destaque turbinados no Google Ads e Meta Ads com máxima visibilidade e engajamento no RealStock.",
    url: "https://www.realstock.com.br/anuncios-turbinados",
  },
};

export default function AnunciosTurbinadosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
