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

    const token = process.env.INSTAGRAM_ACCESS_TOKEN;
    if (!token) {
        return NextResponse.json({ error: "INSTAGRAM_ACCESS_TOKEN não configurado" });
    }

    const results: any = {};

    // 1. Verificar validade do token
    try {
        const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${token}`);
        results.me = await meRes.json();
    } catch(e: any) { results.me = { error: e.message }; }

    // 2. Verificar debug do token
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (appId && appSecret) {
        try {
            const debugRes = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`);
            results.tokenDebug = await debugRes.json();
        } catch(e: any) { results.tokenDebug = { error: e.message }; }
    } else {
        results.tokenDebug = { note: "FACEBOOK_APP_ID ou FACEBOOK_APP_SECRET não configurados — não foi possível fazer debug_token" };
    }

    // 3. Testar uma mídia do Instagram (último post salvo)
    const lastIgSession = await prisma.instagramPreviewSession.findFirst({
        where: { status: "PUBLISHED", publishedMediaId: { not: null } },
        orderBy: { createdAt: "desc" }
    });

    if (lastIgSession?.publishedMediaId) {
        try {
            const mediaRes = await fetch(`https://graph.facebook.com/v19.0/${lastIgSession.publishedMediaId}?fields=id,like_count,comments_count,media_type&access_token=${token}`);
            results.igMediaTest_v19 = await mediaRes.json();
            
            const mediaRes21 = await fetch(`https://graph.facebook.com/v21.0/${lastIgSession.publishedMediaId}?fields=like_count,comments_count,timestamp,media_type,video_id,video_play_count&access_token=${token}`);
            results.igMediaTest_v21 = await mediaRes21.json();
        } catch(e: any) { results.igMediaTest = { error: e.message }; }
    } else {
        results.igMediaTest = { note: "Nenhuma sessão IG publicada encontrada" };
    }

    // 4. Testar um post do Facebook (último salvo)
    const lastFbSession = await prisma.facebookFeedSession.findFirst({
        where: { status: "PUBLISHED", publishedPostId: { not: null } },
        orderBy: { createdAt: "desc" }
    });

    if (lastFbSession?.publishedPostId) {
        try {
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${lastFbSession.publishedPostId}?fields=id,likes.summary(total_count)&access_token=${token}`);
            results.fbPostTest = await fbRes.json();
        } catch(e: any) { results.fbPostTest = { error: e.message }; }
    } else {
        results.fbPostTest = { note: "Nenhuma sessão FB publicada encontrada" };
    }

    return NextResponse.json({
        tokenPresent: true,
        tokenPrefix: token.substring(0, 20) + "...",
        results
    });
}
