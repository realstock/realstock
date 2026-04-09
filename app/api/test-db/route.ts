import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRawUnsafe("SELECT 1 as ok");

    return Response.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}