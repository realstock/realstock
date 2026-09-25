import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.realstock.com.br";

    const properties = await prisma.property.findMany({
      where: {
        listingType: "ALUGUEL_TEMPORADA",
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const urlsXml = properties
      .map(
        (p) => `  <url>
    <loc>${siteUrl}/imovel/${p.id}</loc>
    <lastmod>${(p.createdAt || new Date()).toISOString().split("T")[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`
      )
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlsXml}
</urlset>`;

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("SITEMAP VACATION RENTALS ERROR:", error);
    return new NextResponse("Erro ao gerar sitemap", { status: 500 });
  }
}
