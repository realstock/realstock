import { prisma } from "@/lib/prisma";
import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://www.realstock.com.br";

  const properties = await prisma.property.findMany({
    select: {
      id: true,
    },
  });

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },
    ...properties.map((property) => ({
      url: `${baseUrl}/imovel/${property.id}`,
      lastModified: new Date(),
    })),
  ];
}