import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import xml2js from "xml2js";
import { Decimal } from "@prisma/client/runtime/library";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Usuário não encontrado" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const text = await file.text();
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
    const result = await parser.parseStringPromise(text);

    // O padrão VivaReal geralmente tem a tag raiz <ListingDataFeed> e dentro <Listings><Listing>
    let listings = [];
    if (result.ListingDataFeed?.Listings?.Listing) {
      listings = Array.isArray(result.ListingDataFeed.Listings.Listing)
        ? result.ListingDataFeed.Listings.Listing
        : [result.ListingDataFeed.Listings.Listing];
    } else if (result.Listings?.Listing) {
      listings = Array.isArray(result.Listings.Listing) ? result.Listings.Listing : [result.Listings.Listing];
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ success: false, error: "Nenhum imóvel (Listing) encontrado no XML." }, { status: 400 });
    }

    // Limite de 50 para evitar timeout na rota serverless
    const MAX_IMPORTS = 50;
    const toImport = listings.slice(0, MAX_IMPORTS);
    
    let successCount = 0;
    let failCount = 0;

    for (const listing of toImport) {
      try {
        const title = listing.Title || "Imóvel Importado";
        const description = listing.Details?.Description || "";
        const price = listing.Details?.ListPrice ? new Decimal(listing.Details.ListPrice) : new Decimal(0);
        const areaBuilt = listing.Details?.LivingArea?._ || listing.Details?.LivingArea || "";
        const bedrooms = listing.Details?.Bedrooms ? parseInt(listing.Details.Bedrooms, 10) : 0;
        const bathrooms = listing.Details?.Bathrooms ? parseInt(listing.Details.Bathrooms, 10) : 0;
        const parkingSpaces = listing.Details?.Garage ? parseInt(listing.Details.Garage._ || listing.Details.Garage, 10) : 0;
        const suites = listing.Details?.Suites ? parseInt(listing.Details.Suites, 10) : 0;
        const condominiumFee = listing.Details?.CondominiumFee ? new Decimal(listing.Details.CondominiumFee) : null;
        const propertyType = listing.Details?.PropertyType || "Residencial";

        const country = listing.Location?.Country?._ || listing.Location?.Country || "Brasil";
        const state = listing.Location?.State?._ || listing.Location?.State || "";
        const city = listing.Location?.City || "";
        const neighborhood = listing.Location?.Neighborhood || "";
        const street = listing.Location?.Address || "";
        const zipCode = listing.Location?.ZipCode || "";
        const addressNumber = listing.Location?.AddressNumber || "";
        const latitude = listing.Location?.Latitude ? new Decimal(listing.Location.Latitude) : new Decimal(0);
        const longitude = listing.Location?.Longitude ? new Decimal(listing.Location.Longitude) : new Decimal(0);

        const newProperty = await prisma.property.create({
          data: {
            title,
            description,
            price,
            propertyType,
            area: areaBuilt.toString(),
            areaBuilt: areaBuilt.toString(),
            bedrooms,
            bathrooms,
            parkingSpaces,
            suites,
            condominiumFee,
            legalStatus: "Pronto para morar",
            category: "Venda",
            country,
            state,
            city,
            neighborhood,
            street,
            zipCode,
            addressNumber,
            latitude,
            longitude,
            ownerId: user.id,
          },
        });

        // Parse imagens
        let mediaItems = [];
        if (listing.Media?.Item) {
          mediaItems = Array.isArray(listing.Media.Item) ? listing.Media.Item : [listing.Media.Item];
        }

        const imagesToCreate = mediaItems
          .map((item: any, index: number) => {
            const url = item._ || item;
            if (typeof url === 'string' && url.startsWith('http')) {
              return {
                propertyId: newProperty.id,
                imageUrl: url,
                sortOrder: index,
              };
            }
            return null;
          })
          .filter(Boolean);

        if (imagesToCreate.length > 0) {
          await prisma.propertyImage.createMany({
            data: imagesToCreate,
          });
        }

        successCount++;
      } catch (err) {
        console.error("Erro ao importar listing individual:", err);
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      failCount,
      totalProcessed: toImport.length,
      ignored: listings.length > MAX_IMPORTS ? listings.length - MAX_IMPORTS : 0,
    });
  } catch (error: any) {
    console.error("Erro na importação XML:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro interno no servidor." },
      { status: 500 }
    );
  }
}
