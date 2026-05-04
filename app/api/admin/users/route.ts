import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (!userEmail) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { email: userEmail } });
    if (admin?.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Acesso restrito" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        viralizarCredits: true,
        turbinarCredits: true,
      },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
