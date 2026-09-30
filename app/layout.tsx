import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

import Script from "next/script";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.realstock.com.br"),
  title: {
    default: "RealStock | Imóveis à Venda e Aluguel por Temporada no Brasil",
    template: "%s | RealStock",
  },
  description: "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores no RealStock. Negociação e reservas em tempo real com segurança.",
  keywords: [
    "imóveis à venda",
    "aluguel por temporada",
    "apartamentos para comprar",
    "casas de praia temporada",
    "comprar imóvel direto com proprietário",
    "portal imobiliário brasil",
    "realstock imóveis",
    "zap imóveis alternativa",
    "airbnb brasil",
  ],
  authors: [{ name: "RealStock" }],
  creator: "RealStock",
  publisher: "RealStock",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  verification: {
    google: "LJnsmiNMwhnZfSojznS3i0CBulwp4oaOOImxZ_SKjNE",
  },
  alternates: {
    canonical: "https://www.realstock.com.br",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://www.realstock.com.br",
    siteName: "RealStock",
    title: "RealStock | Imóveis à Venda e Aluguel por Temporada no Brasil",
    description: "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores. Negociação e reservas em tempo real com segurança.",
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
    description: "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores.",
    images: ["https://www.realstock.com.br/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.realstock.com.br/#organization",
  "name": "RealStock",
  "url": "https://www.realstock.com.br",
  "logo": "https://www.realstock.com.br/icon.png",
  "description": "Marketplace imobiliário com negociação em tempo real de imóveis à venda e aluguel por temporada.",
  "sameAs": [
    "https://www.instagram.com/realstockimoveis",
    "https://www.facebook.com/realstockimoveis",
    "https://twitter.com/realstockbr",
    "https://www.youtube.com/@realstockimoveis",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.realstock.com.br/#website",
  "name": "RealStock",
  "url": "https://www.realstock.com.br",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://www.realstock.com.br/?search={search_term_string}",
    "query-input": "required name=search_term_string",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="bg-slate-950 text-white min-h-screen flex flex-col">
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8662280633716608"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        
        {/* Google Analytics (GA4) */}
        <Script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=G-H7KLZYCYCV`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-H7KLZYCYCV');
          `}
        </Script>

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1274929870774414');
            fbq('track', 'PageView');
          `}
        </Script>

        <noscript>
          <img height="1" width="1" style={{ display: 'none' }} src="https://www.facebook.com/tr?id=1274929870774414&ev=PageView&noscript=1" />
        </noscript>
        <Providers>

          <Header />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}