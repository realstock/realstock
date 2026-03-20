import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";

export const metadata = {
  title: "RealStock",
  description: "Marketplace de imóveis com negociação em tempo real",
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
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}