import { prisma } from "@/lib/prisma";
import { MetadataRoute } from "next";
import { getStateBySlug, normalizeSlug } from "@/lib/geoUtils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.realstock.com.br";

  const properties = await prisma.property.findMany({
    select: {
      id: true,
      city: true,
      state: true,
      listingType: true,
      createdAt: true,
    },
  });

  const citySlugs = new Set<string>();
  const stateSlugs = new Set<string>();

  properties.forEach((p) => {
    if (p.city) {
      citySlugs.add(normalizeSlug(p.city));
    }
    if (p.state) {
      const stateInfo = getStateBySlug(p.state);
      if (stateInfo) {
        stateSlugs.add(stateInfo.slug);
      } else {
        stateSlugs.add(normalizeSlug(p.state));
      }
    }
  });

  // Sempre garantir que Ceará esteja explicitamente no sitemap
  stateSlugs.add("ceara");

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/aluguel-temporada`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/imoveis-a-venda`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/anunciar`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/anuncios-turbinados`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/quem-somos`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/termos`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidade`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/instrucoes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/duvidas-frequentes`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Rotas de Hub de Estados (ex: /imoveis/ceara, /imoveis-a-venda/ceara, /aluguel-temporada/ceara)
  const stateRoutes: MetadataRoute.Sitemap = [];
  stateSlugs.forEach((slug) => {
    stateRoutes.push({
      url: `${baseUrl}/imoveis/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    });
    stateRoutes.push({
      url: `${baseUrl}/imoveis-a-venda/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    });
    stateRoutes.push({
      url: `${baseUrl}/aluguel-temporada/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    });
  });

  // Rotas de Cidades
  const cityRoutes: MetadataRoute.Sitemap = Array.from(citySlugs).map((slug) => ({
    url: `${baseUrl}/imoveis/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  }));

  // Rotas Individuais de Imóveis
  const propertyRoutes: MetadataRoute.Sitemap = properties.map((property) => ({
    url: `${baseUrl}/imovel/${property.id}`,
    lastModified: property.createdAt || new Date(),
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [...staticRoutes, ...stateRoutes, ...cityRoutes, ...propertyRoutes];
}