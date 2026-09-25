import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = Number(id);

    if (isNaN(propertyId)) {
      return new NextResponse("ID inválido", { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: { orderBy: { sortOrder: "asc" } }, videos: true }
    });

    if (!property) {
      return new NextResponse("Imóvel não encontrado", { status: 404 });
    }

    const isSeasonal = property.listingType === "ALUGUEL_TEMPORADA";
    const siteUrl = "https://www.realstock.com.br";
    const propertyUrl = `${siteUrl}/imovel/${property.id}`;
    const priceVal = Number(property.price || 0);

    const format = req.nextUrl.searchParams.get("format") || "json";

    if (format === "json") {
      return NextResponse.json({
        google_vacation_rentals_feed: {
          version: "2.0",
          partner: "RealStock PMS Channel Manager",
          property: {
            id: String(property.id),
            name: property.title,
            description: property.description || "",
            type: property.propertyType || (isSeasonal ? "VACATION_RENTAL" : "APARTMENT"),
            category: property.category || "Residencial",
            address: {
              street: property.street || "",
              number: property.addressNumber || "",
              neighborhood: property.neighborhood || "",
              city: property.city || "",
              state: property.state || "",
              country: property.country || "Brasil",
              postal_code: property.zipCode || "",
              latitude: Number(property.latitude),
              longitude: Number(property.longitude)
            },
            capacity: {
              max_guests: property.maxGuests || 6,
              bedrooms: property.bedrooms || 1,
              bathrooms: property.bathrooms || 1,
              min_nights: property.minNights || 1
            },
            pricing: {
              currency: "BRL",
              rate_per_night: priceVal,
              deposit_percentage: Number(property.depositPercentage || 20)
            },
            photos: property.images.map(img => img.imageUrl),
            landing_page: {
              url: propertyUrl,
              action: "BOOK_DIRECT_NO_COMMISSION"
            },
            sync_status: "ACTIVE",
            updated_at: new Date().toISOString()
          }
        }
      });
    }

    // Retornar no padrão XML oficial do Google Vacation Rentals (OTA / PMS Specification)
    const xmlPhotos = property.images.map(i => `        <Photo url="${i.imageUrl}" />`).join("\n");
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<GoogleVacationRentalsFeed version="2.0" partner="RealStock PMS Channel Manager">
  <Listing id="${property.id}">
    <Name><![CDATA[${property.title}]]></Name>
    <Description><![CDATA[${property.description || ""}]]></Description>
    <ListingType>${isSeasonal ? "VACATION_RENTAL" : "REAL_ESTATE"}</ListingType>
    <Location>
      <City>${property.city || ""}</City>
      <State>${property.state || ""}</State>
      <Country>${property.country || "Brasil"}</Country>
      <Latitude>${property.latitude}</Latitude>
      <Longitude>${property.longitude}</Longitude>
    </Location>
    <Capacity>
      <MaxGuests>${property.maxGuests || 6}</MaxGuests>
      <Bedrooms>${property.bedrooms || 1}</Bedrooms>
      <Bathrooms>${property.bathrooms || 1}</Bathrooms>
      <MinNights>${property.minNights || 1}</MinNights>
    </Capacity>
    <Rate>
      <Currency>BRL</Currency>
      <NightlyRate>${priceVal}</NightlyRate>
    </Rate>
    <Photos>
${xmlPhotos}
    </Photos>
    <DirectBooking>
      <LandingPageUrl>${propertyUrl}</LandingPageUrl>
      <PartnerName>RealStock.com.br</PartnerName>
    </DirectBooking>
  </Listing>
</GoogleVacationRentalsFeed>`;

    return new NextResponse(xmlContent, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8"
      }
    });
  } catch (error: any) {
    console.error("GVR FEED ERROR:", error);
    return new NextResponse("Erro ao gerar feed GVR", { status: 500 });
  }
}
