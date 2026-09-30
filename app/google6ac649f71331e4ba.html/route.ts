import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("google-site-verification: google6ac649f71331e4ba.html", {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
