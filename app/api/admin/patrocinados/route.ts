import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Acesso negado." },
        { status: 401 }
      );
    }

    const properties = await prisma.property.findMany({
      where: {
        sponsoredUntil: {
          gt: new Date()
        }
      },
      include: {
        owner: {
          select: { name: true, email: true, id: true }
        },
        images: {
          take: 1
        }
      },
      orderBy: {
        sponsoredUntil: "asc"
      }
    });

    const adminUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      select: { portfolioBoostedUntil: true, googlePortfolioBoostedUntil: true, metaPortfolioBoostedUntil: true }
    });

    const instagramPosts = await prisma.instagramPreviewSession.findMany({
      where: { listingId: -1, status: "PUBLISHED" }
    });

    const facebookPosts = await prisma.facebookFeedSession.findMany({
      where: { listingId: -1, status: "PUBLISHED" }
    });

    return NextResponse.json({
      success: true,
      properties,
      instagramPosts,
      facebookPosts,
      portfolioBoostedUntil: adminUser?.portfolioBoostedUntil,
      googlePortfolioBoostedUntil: adminUser?.googlePortfolioBoostedUntil,
      metaPortfolioBoostedUntil: adminUser?.metaPortfolioBoostedUntil,
    });
  } catch (error: any) {
    console.error("ADMIN PATROCINADOS GET ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar." },
      { status: 500 }
    );
  }
}
