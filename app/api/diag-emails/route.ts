import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const counts = await prisma.emailMessage.groupBy({
      by: ['direction'],
      _count: true
    });
    
    const total = await prisma.emailMessage.count();
    
    return NextResponse.json({ success: true, total, counts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
