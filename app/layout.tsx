import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import SecurityBlocker from "@/components/SecurityBlocker";

export const metadata = {
  title: "RealStock",
  description: "Marketplace de imóveis com negociação em tempo real",
  verification: {
    google: "LJnsmiNMwhnZfSojznS3i0CBulwp4oaOOImxZ_SKjNE",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-950 text-white">
        <Providers>
          <SecurityBlocker />
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}