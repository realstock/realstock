import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso negado" }, { status: 401 });
    }

    const { platform } = await req.json();

    if (!["instagram", "facebook", "google"].includes(platform)) {
      return NextResponse.json({ success: false, error: "Plataforma inválida." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { id: true, portfolioBoostedUntil: true, googlePortfolioBoostedUntil: true, metaPortfolioBoostedUntil: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário Admin não encontrado." }, { status: 404 });
    }

    const durationDays = 15;
    
    // Determine the field to update based on the platform requested
    let fieldToUpdate = "metaPortfolioBoostedUntil";
    if (platform === "google") fieldToUpdate = "googlePortfolioBoostedUntil";

    const baseDate = user[fieldToUpdate as keyof typeof user];
    const startDate = (baseDate && new Date(baseDate as any) > new Date()) ? new Date(baseDate as any) : new Date();

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    const updateData: any = {};
    updateData[fieldToUpdate] = endDate;
    
    if (platform === "instagram" || platform === "facebook") {
        updateData.portfolioBoostedUntil = endDate; // Legacy compatibility
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    return NextResponse.json({ success: true, message: `O tráfego de (+${durationDays} dias) foi alocado com sucesso no ${platform}!` });
  } catch (error: any) {
    console.error("ADMIN PORTFOLIO BOOST ERROR:", error);
    return NextResponse.json({ success: false, error: error.message || "Erro interno" }, { status: 500 });
  }
}
