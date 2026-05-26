import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import xml2js from "xml2js";

export async function GET() {
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

    // Busca todos os imóveis do usuário, incluindo as imagens e os links dos vídeos
    const properties = await prisma.property.findMany({
      where: { ownerId: user.id },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Constrói a estrutura XML VivaReal
    const listingsObj = properties.map((prop) => {
      const imagesList = prop.images.map((img) => ({
        $: { medium: "image" },
        _: img.imageUrl,
      }));

      return {
        ListingID: prop.id.toString(),
        Title: prop.title,
        TransactionType: "For Sale",
        Details: {
          Description: prop.description,
          ListPrice: prop.price?.toString() || "0",
          PropertyType: prop.propertyType || "Residential / Apartment",
          LivingArea: {
            $: { unit: "square metres" },
            _: prop.areaBuilt?.toString() || "0",
          },
          Bedrooms: prop.bedrooms?.toString() || "0",
          Bathrooms: prop.bathrooms?.toString() || "0",
          Garage: {
            $: { type: "Parking Space" },
            _: prop.parkingSpaces?.toString() || "0",
          },
          Suites: prop.suites?.toString() || "0",
          CondominiumFee: prop.condominiumFee?.toString() || "0",
        },
        Location: {
          Country: {
            $: { abbreviation: "BR" },
            _: prop.country || "Brasil",
          },
          State: {
            $: { abbreviation: prop.state || "" },
            _: prop.state || "",
          },
          City: prop.city || "",
          Neighborhood: prop.neighborhood || "",
          Address: prop.street || "",
          ZipCode: prop.zipCode || "",
          AddressNumber: prop.addressNumber || "",
          Latitude: prop.latitude?.toString() || "",
          Longitude: prop.longitude?.toString() || "",
        },
        Media: {
          Item: imagesList,
        },
      };
    });

    const xmlStructure = {
      ListingDataFeed: {
        $: {
          xmlns: "http://www.vivareal.com/schemas/1.0/VIVAREAL",
        },
        Header: {
          Provider: "RealStock CRM",
          Email: user.email,
          ContactName: user.name,
        },
        Listings: {
          Listing: listingsObj,
        },
      },
    };

    const builder = new xml2js.Builder({
      cdata: true,
      xmldec: { version: "1.0", encoding: "UTF-8" },
    });
    const xml = builder.buildObject(xmlStructure);

    // Retorna a resposta forçando o download como arquivo .xml
    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="portifolio_${user.id}_realstock.xml"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("Erro ao exportar XML:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno no servidor ao gerar XML." },
      { status: 500 }
    );
  }
}
