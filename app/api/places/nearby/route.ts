import { NextResponse } from "next/server";

// Cache for 24 hours to reduce API costs
export const revalidate = 86400;

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "Latitude and longitude are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps API Key not configured" },
      { status: 500 }
    );
  }

  // Radius in meters
  const radius = 2000;

  // Detailed categories
  const categories = [
    { type: "supermarket", label: "Supermercados" },
    { type: "bakery", label: "Padarias" },
    { type: "pharmacy", label: "Farmácias" },
    { type: "school", label: "Escolas" },
    { type: "gym", label: "Academias" },
  ];

  try {
    const fetchPromises = categories.map(async (category) => {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${category.type}&key=${apiKey}&language=pt-BR`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        console.error(`Google Places API error for ${category.type}:`, data.status, data.error_message);
      }

      const results = data.results || [];
      
      // Map, calculate distance, and format
      let places = results.map((place: any) => {
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;
        let distanceKm = 0;
        
        if (placeLat && placeLng) {
          distanceKm = getDistanceFromLatLonInKm(lat, lng, placeLat, placeLng);
        }

        return {
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          distanceKm: distanceKm,
          distanceFormatted: distanceKm < 1 ? `${Math.round(distanceKm * 1000)}m` : `${distanceKm.toFixed(1)} km`,
          mapUrl: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${placeLat},${placeLng}&destination_place_id=${place.place_id}`
        };
      });

      // Sort by distance and keep only the top 5
      places.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
      const topPlaces = places.slice(0, 5);

      return {
        type: category.type,
        label: category.label,
        count: results.length, // Total found in radius
        places: topPlaces,
      };
    });

    const results = await Promise.all(fetchPromises);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching places:", error);
    return NextResponse.json(
      { error: "Failed to fetch nearby places" },
      { status: 500 }
    );
  }
}
