import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import HomeClient, { normalizeProperties, type PropertyPin } from "./HomeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RealStock | Imóveis à Venda e Aluguel por Temporada no Brasil",
  description:
    "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores no RealStock. Negociação e reservas em tempo real com segurança.",
  alternates: {
    canonical: "https://www.realstock.com.br",
  },
  openGraph: {
    title: "RealStock | Imóveis à Venda e Aluguel por Temporada no Brasil",
    description:
      "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores no RealStock. Negociação e reservas em tempo real com segurança.",
    url: "https://www.realstock.com.br",
    type: "website",
    locale: "pt_BR",
    siteName: "RealStock",
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
    description:
      "Encontre casas, apartamentos e imóveis à venda ou aluguel por temporada direto com proprietários e corretores.",
    images: ["https://www.realstock.com.br/icon.png"],
  },
};

async function getInitialProperties(): Promise<PropertyPin[]> {
  try {
    const rawProperties = await prisma.property.findMany({
      include: {
        images: {
          take: 1,
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 60,
    });
    return normalizeProperties(rawProperties);
  } catch (error) {
    console.error("Erro ao carregar imóveis no SSR da Home:", error);
    return [];
  }
}

export default async function HomePage() {
  const initialProperties = await getInitialProperties();
  return <HomeClient initialProperties={initialProperties} />;
}

