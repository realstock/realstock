import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRawUnsafe<
      Array<{
        current_database: string;
        current_schema: string;
        host: string | null;
        properties_exists: string | null;
        offers_exists: string | null;
        users_exists: string | null;
      }>
    >(`
      select
        current_database() as current_database,
        current_schema() as current_schema,
        inet_server_addr()::text as host,
        to_regclass('public.properties')::text as properties_exists,
        to_regclass('public.offers')::text as offers_exists,
        to_regclass('public.users')::text as users_exists
    `);

    return NextResponse.json({
      success: true,
      debug: result[0],
      envHostHint: process.env.DATABASE_URL?.includes("kreduixqigopfbqkvicw")
        ? "looks-like-your-supabase-project"
        : "different-host",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "debug failed",
      },
      { status: 500 }
    );
  }
}