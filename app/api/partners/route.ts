import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const partners = await prisma.user.findMany({
      where: {
        companyLogo: { not: null },
        logoBoostedUntil: { gt: now },
      },
      select: {
        id: true,
        name: true,
        companyLogo: true,
      },
      take: 10, // Limitar as primeiras 10
    });

    return NextResponse.json({ success: true, partners });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
