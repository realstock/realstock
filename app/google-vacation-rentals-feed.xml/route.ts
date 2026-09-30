import { NextRequest, NextResponse } from "next/server";
import { GET as getFeed } from "@/app/api/google-vacation-rentals/feed/route";

export async function GET(req: NextRequest) {
  // Configura req para format=xml explicitamente
  const url = new URL(req.url);
  url.searchParams.set("format", "xml");
  const forwardReq = new NextRequest(url, req);
  return getFeed(forwardReq);
}
