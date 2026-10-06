import { NextResponse } from "next/server";
import { pauseExpiredGoogleAdsCampaigns } from "@/lib/googleAds";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isDev = process.env.NODE_ENV !== "production";
      if (!isDev) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await pauseExpiredGoogleAdsCampaigns();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Cron pause expired campaigns error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
