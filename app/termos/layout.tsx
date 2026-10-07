import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso | RealStock",
  description: "Termos e condições gerais de uso da plataforma RealStock.",
  alternates: {
    canonical: "https://www.realstock.com.br/termos",
  },
  openGraph: {
    title: "Termos de Uso | RealStock",
    description: "Termos e condições gerais de uso da plataforma RealStock.",
    url: "https://www.realstock.com.br/termos",
  },
};

export default function TermosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
