import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const igTotal = await prisma.instagramPreviewSession.count();
    const igPublished = await prisma.instagramPreviewSession.count({ where: { status: "PUBLISHED" } });
    const igSample = await prisma.instagramPreviewSession.findMany({ take: 5, orderBy: { createdAt: "desc" } });

    const fbTotal = await prisma.facebookFeedSession.count();
    const fbPublished = await prisma.facebookFeedSession.count({ where: { status: "PUBLISHED" } });
    const fbSample = await prisma.facebookFeedSession.findMany({ take: 5, orderBy: { createdAt: "desc" } });

    // Properties with instagramMediaId set
    const propertiesWithIgId = await prisma.property.count({ where: { instagramMediaId: { not: null } } });
    const samplePropsWithIgId = await prisma.property.findMany({
        where: { instagramMediaId: { not: null } },
        take: 5,
        select: { id: true, title: true, instagramMediaId: true, instagramPermalink: true }
    });

    return NextResponse.json({
        instagramSessions: { total: igTotal, published: igPublished, sample: igSample },
        facebookSessions: { total: fbTotal, published: fbPublished, sample: fbSample },
        propertiesWithInstagramMediaId: { count: propertiesWithIgId, sample: samplePropsWithIgId }
    });
}
