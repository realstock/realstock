import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import SecurityBlocker from "@/components/SecurityBlocker";
import Script from "next/script";

export const metadata = {
  title: "RealStock",
  description: "Marketplace de imóveis com negociação em tempo real",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
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
      <head>
        <meta name="google-adsense-account" content="ca-pub-8662280633716608" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8662280633716608"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
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