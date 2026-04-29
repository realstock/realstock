import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Buscar todos os serviços ativos e suas taxas
    const services = await prisma.siteService.findMany({
      where: { isActive: true },
      include: { fee: true }
    });

    // Mapear para um formato fácil de usar no modal Viralizar
    // O objetivo é encontrar os serviços específicos do pacote
    const viralizarServices = [
      { id: "google", keywords: ["patrocinar site", "anuncio patrocinado"], defaultName: "Patrocinar Site", defaultValue: 50 },
      { id: "video", keywords: ["criar vídeo", "vídeo ia"], defaultName: "Criar Vídeo", defaultValue: 0 },
      { id: "ig_carousel", keywords: ["carrossel instagram", "post de anuncio"], defaultName: "Postar Carrossel Insta", defaultValue: 50 },
      { id: "ig_reels", keywords: ["video instagram", "reel instagram", "post de anuncio"], defaultName: "Postar Vídeo Insta", defaultValue: 50 },
      { id: "fb_carousel", keywords: ["carrossel facebook", "post de anuncio"], defaultName: "Postar Carrossel Facebook", defaultValue: 50 },
      { id: "fb_reels", keywords: ["video facebook", "reel facebook", "post de anuncio"], defaultName: "Postar Vídeo Facebook", defaultValue: 50 },
    ];

    const result = viralizarServices.map(v => {
      // Tentar encontrar um serviço que contenha as palavras-chave
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


    return NextResponse.json({
      success: true,
      services: result
    });
  } catch (error: any) {
    console.error("VIRALIZAR FEES ERROR:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
