import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface ReelsScriptResponse {
  hook: string;
  subtitle: string;
  priceTag: string;
  featureBadge: string;
  scenes: { headline: string; sub: string }[];
  cta: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(req, context);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const propertyId = Number(resolvedParams.id);
    const body = await req.json().catch(() => ({}));
    const imageCount = Math.max(3, Math.min(12, Number(body.imageCount) || 8));

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    let property: any = null;
    const isPortfolio = propertyId === 0;

    if (isPortfolio) {
      const userProperties = await prisma.property.findMany({
        where: { ownerId: user.id },
        select: { id: true, title: true, city: true, state: true, price: true, listingType: true },
        take: 8,
      });

      property = {
        id: 0,
        title: "Portfólio Exclusivo RealStock",
        city: userProperties[0]?.city || "Brasil",
        state: userProperties[0]?.state || "",
        price: 0,
        listingType: "COMPRA_VENDA",
        category: "Portfólio de Imóveis",
        bedrooms: 0,
        suites: 0,
        bathrooms: 0,
        parkingSpaces: 0,
        area: 0,
        description: `Seleção de ${userProperties.length} imóveis premium disponíveis no RealStock.`,
      };
    } else {
      property = await prisma.property.findFirst({
        where: { id: propertyId, ownerId: user.id },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 12 },
        },
      });

      if (!property) {
        return NextResponse.json({ success: false, error: "Imóvel não encontrado" }, { status: 404 });
      }
    }

    const isSeasonal = property.listingType === "ALUGUEL_TEMPORADA";
    const formattedPrice = property.price 
      ? Number(property.price).toLocaleString("pt-BR")
      : "Consulte";
    const location = [property.neighborhood, property.city, property.state].filter(Boolean).join(", ") || "Localização Privilegiada";

    // Fallback inteligente para garantir resposta mesmo sem internet / chave Gemini
    const generateFallbackScript = (): ReelsScriptResponse => {
      if (isSeasonal) {
        const defaultSeasonalScenes = [
          { headline: "Seu Refúgio Perfeito", sub: `Hospedagem exclusiva em ${property.city || "localização paradisíaca"}` },
          { headline: "Conforto & Lazer Completo", sub: property.pool ? "Piscina privativa para relaxar" : "Espaço amplo e aconchegante" },
          { headline: "Ambientes Equipados", sub: property.furnished ? "Totalmente mobiliado e climatizado" : "Pronto para receber sua família" },
          { headline: "Quartos Climatizados", sub: `${property.bedrooms || 2} quartos • ${property.maxGuests || 6} hóspedes` },
          { headline: "Momentos Inesquecíveis", sub: "Viva dias de descanso com total segurança" },
          { headline: "Localização Privilegiada", sub: property.neighborhood ? `No coração de ${property.neighborhood}` : "Perto dos melhores pontos turísticos" },
          { headline: "Fácil Check-in & Suporte", sub: "Reserva direta online 100% garantida" },
          { headline: "Datas Disponíveis", sub: "Garanta já o seu período de temporada" },
        ];

        return {
          hook: `Procurando o lugar ideal para suas férias em ${property.city || "uma viagem incrível"}? 🌴`,
          subtitle: `${property.city ? `${property.city} • ` : ""}ALUGUEL POR TEMPORADA`,
          priceTag: `R$ ${formattedPrice} / diária`,
          featureBadge: `${property.maxGuests ? `Até ${property.maxGuests} hóspedes` : "Temporada Exclusiva"} • ${property.bedrooms ? `${property.bedrooms} qtos` : "Lazer Completo"}`,
          scenes: defaultSeasonalScenes.slice(0, imageCount),
          cta: "Reserve suas datas direto na RealStock! 📲",
        };
      }

      // Compra e Venda
      const defaultSaleScenes = [
        { headline: "Fachada & Design Moderno", sub: `Arquitetura sofisticada em ${property.city || "bairro nobre"}` },
        { headline: "Living Amplo Integrado", sub: "Espaços generosos com iluminação natural" },
        { headline: "Cozinha & Espaço Gourmet", sub: "Conceito moderno pensado para receber amigos" },
        { headline: "Suíte Master Confortável", sub: property.suites ? `${property.suites} suíte(s) com acabamento refinado` : "Conforto e privacidade para sua família" },
        { headline: "Área de Lazer & Bem-Estar", sub: property.pool ? "Piscina e infraestrutura completa" : "Condomínio seguro e estruturado" },
        { headline: "Metragem & Garagem", sub: `${property.area ? `${property.area} m² privativos` : "Planta inteligente"} • ${property.parkingSpaces || 2} vagas` },
        { headline: "Alta Valorização", sub: property.neighborhood ? `No melhor de ${property.neighborhood}` : "Região nobre em pleno crescimento" },
        { headline: "Pronto para Negociação", sub: "Documentação verificada pela RealStock" },
      ];

      return {
        hook: `Conheça este imóvel exclusivo à venda em ${property.city || "localização privilegiada"}! ✨`,
        subtitle: `${property.city ? `${property.city} • ` : ""}IMÓVEL À VENDA`,
        priceTag: `R$ ${formattedPrice}`,
        featureBadge: `${property.area ? `${property.area} m²` : "Alto Padrão"} • ${property.bedrooms ? `${property.bedrooms} qtos` : "Exclusivo"}${property.suites ? ` (${property.suites} suítes)` : ""}`,
        scenes: defaultSaleScenes.slice(0, imageCount),
        cta: "Envie sua proposta direto na RealStock! 📲",
      };
    };

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: true, script: generateFallbackScript() });
    }

    const systemPrompt = isSeasonal
      ? `Você é um diretor de criação e roteirista especialista em vídeos virais de Reels/TikTok para ALUGUEL DE TEMPORADA de luxo e viagens.
Crie um roteiro empolgante, focado em descanso, lazer, família/amigos, férias e comodidades para ${imageCount} cenas/fotos de um imóvel de temporada.
DADOS DO IMÓVEL:
- Título: ${property.title}
- Local: ${location}
- Valor: R$ ${formattedPrice} / diária
- Quartos: ${property.bedrooms || "N/A"}, Suítes: ${property.suites || "N/A"}
- Hóspedes: ${property.maxGuests || "N/A"}, Piscina: ${property.pool ? "Sim" : "Não"}, Mobiliado: ${property.furnished ? "Sim" : "Não"}
- Descrição: ${property.description?.substring(0, 300) || ""}

REGRAS:
- Retorne rigorosamente um JSON válido com a seguinte estrutura:
{
  "hook": "Frase curta de abertura muito magnética com emoji (ex: 'O refúgio de praia dos seus sonhos em Flecheiras 🌴')",
  "subtitle": "Texto curto para badge superior (ex: '${property.city || "CEARÁ"} • ALUGUEL POR TEMPORADA')",
  "priceTag": "R$ ${formattedPrice} / diária",
  "featureBadge": "Texto curto de comodidades (ex: 'Até ${property.maxGuests || 6} hóspedes • Piscina & Churrasqueira')",
  "scenes": [
    { "headline": "Título da cena (2 a 4 palavras impactantes)", "sub": "Subtítulo explicativo com detalhe de hospedagem (4 a 8 palavras)" }
  ],
  "cta": "Chamada final empolgante (ex: 'Reserve suas datas online no RealStock! 📲')"
}
Gere EXATAMENTE ${imageCount} itens no array 'scenes'. Retorne APENAS o JSON puro sem formatação markdown.`
      : `Você é um diretor de criação e roteirista especialista em vídeos virais de Reels/TikTok para VENDA DE IMÓVEIS de alto padrão.
Crie um roteiro de vendas persuasivo, focado em conquista, valorização patrimonial, sofisticação e estilo de vida para ${imageCount} cenas/fotos de um imóvel à venda.
DADOS DO IMÓVEL:
- Título: ${property.title}
- Local: ${location}
- Valor de Venda: R$ ${formattedPrice}
- Quartos: ${property.bedrooms || "N/A"}, Suítes: ${property.suites || "N/A"}
- Vagas: ${property.parkingSpaces || "N/A"}, Área: ${property.area ? `${property.area} m²` : "N/A"}
- Piscina: ${property.pool ? "Sim" : "Não"}, Financiamento: ${property.acceptsFinancing ? "Aceita" : "Sob consulta"}
- Descrição: ${property.description?.substring(0, 300) || ""}

REGRAS:
- Retorne rigorosamente um JSON válido com a seguinte estrutura:
{
  "hook": "Frase curta de abertura muito magnética com emoji (ex: 'Você moraria nesta mansão dos sonhos em Fortaleza? ✨')",
  "subtitle": "Texto curto para badge superior (ex: '${property.city || "BRASIL"} • IMÓVEL À VENDA')",
  "priceTag": "R$ ${formattedPrice}",
  "featureBadge": "Texto curto de destaques (ex: '${property.area ? `${property.area} m²` : "Alto Padrão"} • ${property.suites || property.bedrooms || 3} Suítes • ${property.parkingSpaces || 2} Vagas')",
  "scenes": [
    { "headline": "Título da cena (2 a 4 palavras impactantes)", "sub": "Subtítulo valorizando o espaço e acabamento (4 a 8 palavras)" }
  ],
  "cta": "Chamada final persuasiva (ex: 'Envie sua proposta direto no RealStock! 📲')"
}
Gere EXATAMENTE ${imageCount} itens no array 'scenes'. Retorne APENAS o JSON puro sem formatação markdown.`;

    const candidateModels = ["gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-1.5-flash"];

    for (const model of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;

        const cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed: ReelsScriptResponse = JSON.parse(cleanJson);

        if (parsed.hook && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
          // Ajusta tamanho das cenas para corresponder a imageCount
          while (parsed.scenes.length < imageCount) {
            parsed.scenes.push(parsed.scenes[parsed.scenes.length % parsed.scenes.length]);
          }
          parsed.scenes = parsed.scenes.slice(0, imageCount);

          return NextResponse.json({
            success: true,
            script: parsed,
            source: "gemini",
            model,
          });
        }
      } catch (err) {
        console.warn(`Tentativa com modelo ${model} falhou:`, err);
      }
    }

    // Se nenhum modelo respondeu, usa o fallback de alta fidelidade
    return NextResponse.json({
      success: true,
      script: generateFallbackScript(),
      source: "fallback",
    });
  } catch (error: any) {
    console.error("Erro na rota ai-reels-script:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
