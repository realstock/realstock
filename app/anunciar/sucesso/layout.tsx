import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anúncio Publicado com Sucesso | RealStock",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AnunciarSucessoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
