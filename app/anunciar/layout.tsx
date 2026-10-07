import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anunciar Imóvel | RealStock",
  description:
    "Cadastre seu imóvel à venda ou para aluguel de temporada no RealStock e alcance milhares de compradores e hóspedes com fotos, geolocalização e automação de anúncios.",
  alternates: {
    canonical: "https://www.realstock.com.br/anunciar",
  },
  openGraph: {
    title: "Anunciar Imóvel | RealStock",
    description:
      "Cadastre seu imóvel à venda ou para aluguel de temporada no RealStock e alcance milhares de compradores e hóspedes com fotos, geolocalização e automação de anúncios.",
    url: "https://www.realstock.com.br/anunciar",
  },
};

export default function AnunciarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
