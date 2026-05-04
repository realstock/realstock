import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const id = 37;
    const property = await prisma.property.findUnique({ where: { id } });
    const igSessions = await prisma.instagramPreviewSession.findMany({ where: { listingId: id } });
    const fbSessions = await prisma.facebookFeedSession.findMany({ where: { listingId: id } });
    
    return NextResponse.json({
      propertyMediaId: property?.instagramMediaId,
      igSessions,
      fbSessions
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
