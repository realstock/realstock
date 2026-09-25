import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.realstock.com.br";
    const format = req.nextUrl.searchParams.get("format") || "xml";

    // Buscar todos os imóveis ativos de aluguel por temporada
    const properties = await prisma.property.findMany({
      where: {
        listingType: "ALUGUEL_TEMPORADA",
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        videos: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      return NextResponse.json({
        google_vacation_rentals_feed: {
          version: "2.0",
          partner: "RealStock OpenTravel PMS Engine",
          generated_at: new Date().toISOString(),
          total_listings: properties.length,
          listings: properties.map((p) => {
            const priceVal = Number(p.price || 0);
            const propertyUrl = `${siteUrl}/imovel/${p.id}`;
            const deeplink = `${propertyUrl}?checkin={checkin}&checkout={checkout}&guests={guests}&utm_source=google&utm_medium=vacation_rentals`;

            const photos = p.images.map((img) => img.imageUrl);
            while (photos.length < 5) {
              photos.push(
                photos[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
              );
            }

            return {
              id: String(p.id),
              name: p.title,
              description: p.description || "",
              property_type: p.propertyType || "VACATION_RENTAL",
              location: {
                address: p.street || p.neighborhood || "",
                city: p.city || "Fortaleza",
                state: p.state || "CE",
                country: p.country || "Brasil",
                postal_code: p.zipCode || "60000-000",
                latitude: Number(p.latitude || -3.7319),
                longitude: Number(p.longitude || -38.5267),
              },
              capacity: {
                max_guests: p.maxGuests || 4,
                bedrooms: p.bedrooms || 1,
                bathrooms: p.bathrooms || 1,
                beds: p.bedrooms || 1,
                min_nights: p.minNights || 1,
              },
              amenities: [
                p.pool ? "SwimmingPool" : null,
                p.frontSea ? "OceanView" : null,
                p.furnished ? "Furnished" : null,
                p.condominium ? "AirConditioning" : null,
                p.parkingSpaces ? "FreeParking" : null,
                "Wifi",
                "Kitchen",
              ].filter(Boolean),
              pricing: {
                currency: "BRL",
                rate_per_night: priceVal,
                deposit_percentage: Number(p.depositPercentage || 20),
              },
              photos,
              landing_page: {
                url: deeplink,
                action: "BOOK_DIRECT_NO_COMMISSION",
              },
            };
          }),
        },
      });
    }

    // Gerar XML no formato Google Vacation Rentals Feed Specification (OpenTravel Standard)
    const xmlListings = properties
      .map((p) => {
        const priceVal = Number(p.price || 0);
        const propertyUrl = `${siteUrl}/imovel/${p.id}`;
        const deeplink = `${propertyUrl}?checkin={checkin}&checkout={checkout}&guests={guests}&utm_source=google&utm_medium=vacation_rentals`;

        const photos = p.images.map((img) => img.imageUrl);
        while (photos.length < 5) {
          photos.push(
            photos[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"
          );
        }

        const photosXml = photos
          .map((url) => `        <Photo url="${url}" />`)
          .join("\n");

        return `    <Listing id="${p.id}">
      <Name><![CDATA[${p.title}]]></Name>
      <Description><![CDATA[${p.description || ""}]]></Description>
      <ListingType>VACATION_RENTAL</ListingType>
      <Location>
        <StreetAddress><![CDATA[${p.street || p.neighborhood || ""}]]></StreetAddress>
        <City>${p.city || "Fortaleza"}</City>
        <State>${p.state || "CE"}</State>
        <Country>${p.country || "Brasil"}</Country>
        <PostalCode>${p.zipCode || "60000-000"}</PostalCode>
        <Latitude>${p.latitude || -3.7319}</Latitude>
        <Longitude>${p.longitude || -38.5267}</Longitude>
      </Location>
      <Capacity>
        <MaxGuests>${p.maxGuests || 4}</MaxGuests>
        <Bedrooms>${p.bedrooms || 1}</Bedrooms>
        <Bathrooms>${p.bathrooms || 1}</Bathrooms>
        <Beds>${p.bedrooms || 1}</Beds>
        <MinNights>${p.minNights || 1}</MinNights>
      </Capacity>
      <Amenities>
        ${p.pool ? "<Amenity>SwimmingPool</Amenity>" : ""}
        ${p.frontSea ? "<Amenity>OceanView</Amenity>" : ""}
        ${p.furnished ? "<Amenity>Furnished</Amenity>" : ""}
        <Amenity>Wifi</Amenity>
        <Amenity>Kitchen</Amenity>
        <Amenity>AirConditioning</Amenity>
      </Amenities>
      <Rate>
        <Currency>BRL</Currency>
        <NightlyRate>${priceVal}</NightlyRate>
      </Rate>
      <Photos>
${photosXml}
      </Photos>
      <DirectBooking>
        <LandingPageUrl><![CDATA[${deeplink}]]></LandingPageUrl>
        <PartnerName>RealStock</PartnerName>
        <Action>BOOK_DIRECT</Action>
      </DirectBooking>
    </Listing>`;
      })
      .join("\n\n");

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<GoogleVacationRentalsFeed version="2.0" partner="RealStock PMS Channel Manager" generatedAt="${new Date().toISOString()}">
  <Listings>
${xmlListings}
  </Listings>
</GoogleVacationRentalsFeed>`;

    return new NextResponse(xmlContent, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error: any) {
    console.error("GVR GLOBAL FEED ERROR:", error);
    return new NextResponse("Erro ao gerar feed global GVR", { status: 500 });
  }
}
