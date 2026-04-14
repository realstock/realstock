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

    const publications = await prisma.adminSponsoredPublication.findMany({
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      properties,
      publications,
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, propertyIds } = await req.json();

    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
      return NextResponse.json({ success: false, error: "Missing properties array" }, { status: 400 });
    }

    const pub = await prisma.adminSponsoredPublication.create({
      data: {
        name,
        propertyIds
      }
    });

    return NextResponse.json({ success: true, publication: pub });
  } catch (error: any) {
    console.error("POST publications error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
