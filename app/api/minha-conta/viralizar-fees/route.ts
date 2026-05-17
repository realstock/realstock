import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get("propertyId");
    const isPortfolio = propertyId === "0";

    // Buscar todos os serviços ativos e suas taxas
    let services: any[] = [];
    try {
      services = await prisma.siteService.findMany({
        where: { isActive: true },
        include: { fee: true }
      });
    } catch (dbError) {
      console.warn("DB Connection failed in viralizar-fees, using defaults:", dbError);
    }


    // Mapear para um formato fácil de usar no modal Viralizar
    const viralizarServices = [
      { id: "sponsored", keywords: ["patrocinar site", "anuncio patrocinado"], defaultName: "Anúncio Patrocinado (Site)", defaultValue: isPortfolio ? 0 : 50 },
      { id: "video", keywords: ["criar vídeo", "vídeo ia"], defaultName: "Criar Vídeo (IA)", defaultValue: 0 },
      { id: "ig_carousel", keywords: ["carrossel instagram", "post de anuncio"], defaultName: "Postar Carrossel Insta", defaultValue: isPortfolio ? 100 : 50 },
      { id: "ig_reels", keywords: ["video instagram", "reel instagram", "post de anuncio"], defaultName: "Postar Reels Insta", defaultValue: isPortfolio ? 100 : 50 },
      { id: "fb_carousel", keywords: ["carrossel facebook", "post de anuncio"], defaultName: "Postar Carrossel Facebook", defaultValue: isPortfolio ? 100 : 50 },
      { id: "fb_reels", keywords: ["video facebook", "reel facebook", "post de anuncio"], defaultName: "Postar Reels Facebook", defaultValue: isPortfolio ? 100 : 50 },
      { id: "x_carousel", keywords: ["carrossel x", "carrossel twitter"], defaultName: "Postar Carrossel X (Twitter)", defaultValue: isPortfolio ? 100 : 50 },
      { id: "x_reels", keywords: ["video x", "reel x", "video twitter", "reel twitter"], defaultName: "Postar Reels X (Twitter)", defaultValue: isPortfolio ? 100 : 50 },
    ];

    const result = viralizarServices.map(v => {
      // Para o portfólio, ignoramos o banco e usamos os valores fixos solicitados se for o caso
      if (isPortfolio) {
        return {
          id: v.id,
          name: v.defaultName,
          value: v.defaultValue,
          found: true
        };
      }

      // Tentar encontrar um serviço que contenha as palavras-chave no banco
      const found = services.find(s => 
        v.keywords.some(k => s.name.toLowerCase().includes(k))
      );

      return {
        id: v.id,
        name: v.defaultName,
        value: found && found.fee ? Number(found.fee.value) : v.defaultValue,
        found: !!found
      };
    });


    const totalOriginal = result.reduce((acc, curr) => acc + curr.value, 0);
    const totalFinal = totalOriginal * 0.5;

    return NextResponse.json({
      success: true,
      services: result,
      totalOriginal,
      totalFinal
    });
  } catch (error: any) {
    console.error("VIRALIZAR FEES ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
