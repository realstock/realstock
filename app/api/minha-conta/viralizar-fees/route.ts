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
      { id: "google", keywords: ["patrocinar site", "google ads"], defaultName: "Patrocinar Site" },
      { id: "video", keywords: ["vídeo ia", "criar vídeo", "reels video"], defaultName: "Criar Vídeo IA" },
      { id: "ig_carousel", keywords: ["carrossel instagram", "carousel instagram", "post de anuncio", "publicação de anuncio"], defaultName: "Postar Carrossel Instagram" },
      { id: "ig_reels", keywords: ["reel instagram"], defaultName: "Postar Reel Instagram" },
      { id: "fb_carousel", keywords: ["carrossel facebook", "carousel facebook"], defaultName: "Postar Carrossel Facebook" },
      { id: "fb_reels", keywords: ["reel facebook"], defaultName: "Postar Reel Facebook" },
    ];

    const result = viralizarServices.map(v => {
      const found = services.find(s => 
        v.keywords.some(k => s.name.toLowerCase().includes(k))
      );

      return {
        id: v.id,
        name: found ? found.name : v.defaultName,
        value: found && found.fee ? Number(found.fee.value) : 0,
        found: !!found
      };
    });

    // Se "Patrocinar Site" contiver "Google Ads", vamos limpar o nome conforme solicitado pelo usuário
    result.forEach(r => {
      if (r.id === "google") {
        r.name = "Patrocinar Site";
      }
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
