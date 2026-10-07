import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editar Imóvel | RealStock",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditarAnuncioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
