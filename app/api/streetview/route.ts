import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return new NextResponse("Latitude and longitude are required", { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new NextResponse("Google Maps API Key not configured", { status: 500 });
  }

  // size=600x400 (sufficient for our UI)
  // radius=1000 searches within 1km for nearest Street View panorama
  // return_error_code=true ensures we get a 404 instead of a generic grey placeholder if no image exists
  const url = `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&radius=1000&return_error_code=true&key=${apiKey}`;

  try {
    const response = await fetch(url);
    
    // If Street View imagery doesn't exist for this location, return 404
    if (!response.ok) {
      return new NextResponse("Street View not found", { status: response.status });
    }

    // Get the image buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return the image directly with strong caching headers (30 days)
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (error) {
    console.error("Error fetching Street View:", error);
    return new NextResponse("Failed to fetch Street View", { status: 500 });
  }
}
