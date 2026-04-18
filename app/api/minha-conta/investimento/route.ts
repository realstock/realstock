import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Não autenticado" }, { status: 401 });
    }

    const userId = Number((session.user as any).id);

    // Buscar todas as transações de REVENUE desse usuário
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        userId: userId,
        type: "REVENUE",
      },
      orderBy: { createdAt: "desc" },
    });

    const totalSpent = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    // Agrupar por categoria
    const categories: Record<string, number> = {};
    transactions.forEach((t) => {
      const cat = t.category || "OUTROS";
      categories[cat] = (categories[cat] || 0) + Number(t.amount);
    });

    // Mapear nomes de categoria legíveis
    const categoryLabels: Record<string, string> = {
      SPONSOR: "Patrocínio de Imóveis",
      POSTS: "Publicações Redes Sociais",
      ADS_BOOST: "Impulsionamento de Ads",
      OTHER: "Outros Serviços (Logo/Marca)",
      OFFER: "Taxas de Oferta",
    };

    const breakdown = Object.entries(categories).map(([key, val]) => ({
      label: categoryLabels[key] || key,
      value: val,
    }));

    return NextResponse.json({
      success: true,
      totalSpent,
      transactions,
      breakdown,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
