import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cadastre-se | RealStock",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CadastroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
