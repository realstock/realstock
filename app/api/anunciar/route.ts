import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const BRAZILIAN_STATES = [
  "Acre",
  "Alagoas",
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins",
] as const;

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidBrazilianState(value: string) {
  return BRAZILIAN_STATES.includes(value as (typeof BRAZILIAN_STATES)[number]);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    const ownerId = Number((session.user as any).id);

    if (!ownerId || Number.isNaN(ownerId)) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);

    const legalStatus = String(body.legal_status || "").trim();
    const areaTotal = String(body.area_total || "").trim();
    const areaBuilt = String(body.area_built || "").trim();

    const category = String(body.category || "").trim();
    const propertyType = String(body.property_type || "").trim();

    const country = String(body.country || "").trim();
    const stateName = String(body.state || "").trim();
    const city = String(body.city || "").trim();
    const neighborhood = String(body.neighborhood || "").trim();
    const street = String(body.street || "").trim();
    const addressNumber = String(body.address_number || "").trim();
    const zipCode = String(body.zip_code || "").trim();

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    const googleMapsLink = String(body.google_maps_link || "").trim();
    const googleMapsThumbnail = String(
      body.google_maps_thumbnail || ""
    ).trim();

    const youtubeLink = String(body.youtube_link || "").trim();
    const youtubeThumbnail = String(body.youtube_thumbnail || "").trim();

    const topographyPoints = String(body.topography_points || "").trim();

    const bedrooms =
      body.bedrooms !== null &&
      body.bedrooms !== undefined &&
      body.bedrooms !== ""
        ? Number(body.bedrooms)
        : null;

    const bathrooms =
      body.bathrooms !== null &&
      body.bathrooms !== undefined &&
      body.bathrooms !== ""
        ? Number(body.bathrooms)
        : null;

    const parkingSpaces =
      body.parking_spaces !== null &&
      body.parking_spaces !== undefined &&
      body.parking_spaces !== ""
        ? Number(body.parking_spaces)
        : null;

    const suites =
      body.suites !== null &&
      body.suites !== undefined &&
      body.suites !== ""
        ? Number(body.suites)
        : null;

    const furnished = Boolean(body.furnished);
    const condominium = Boolean(body.condominium);

    const condominiumFee =
      body.condominium_fee !== null &&
      body.condominium_fee !== undefined &&
      body.condominium_fee !== ""
        ? Number(body.condominium_fee)
        : null;

    const acceptsFinancing = Boolean(body.accepts_financing);
    const frontSea = Boolean(body.front_sea);
    const pool = Boolean(body.pool);

    const images: string[] = Array.isArray(body.images)
      ? body.images
          .map((item: unknown) => String(item || "").trim())
          .filter(Boolean)
      : [];

    if (!title || !description || !price) {
      return NextResponse.json(
        { success: false, error: "Dados básicos obrigatórios." },
        { status: 400 }
      );
    }

    if (!category || !propertyType) {
      return NextResponse.json(
        { success: false, error: "Categoria e tipo são obrigatórios." },
        { status: 400 }
      );
    }

    if (!city || !stateName || !country) {
      return NextResponse.json(
        { success: false, error: "Endereço incompleto." },
        { status: 400 }
      );
    }

    if (!isValidBrazilianState(stateName)) {
      return NextResponse.json(
        {
          success: false,
          error: "Estado inválido. Selecione um dos 27 estados do Brasil.",
        },
        { status: 400 }
      );
    }

    if (
      latitude === null ||
      longitude === null ||
      latitude === undefined ||
      longitude === undefined ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return NextResponse.json(
        { success: false, error: "Localização inválida." },
        { status: 400 }
      );
    }

    if (!images.length) {
      return NextResponse.json(
        { success: false, error: "Envie ao menos uma imagem." },
        { status: 400 }
      );
    }

    const invalidImage = images.find((url) => !isValidHttpUrl(url));
    if (invalidImage) {
      return NextResponse.json(
        { success: false, error: "Uma ou mais imagens possuem URL inválida." },
        { status: 400 }
      );
    }

    const property = await prisma.property.create({
      data: {
        ownerId,

        title,
        description,
        price,

        legalStatus,
        area: areaTotal,
        areaBuilt: areaBuilt || null,

        category,
        propertyType,

        country,
        state: stateName,
        city,
        neighborhood: neighborhood || null,
        street: street || null,
        addressNumber: addressNumber || null,
        zipCode: zipCode || null,

        latitude,
        longitude,

        googleMapsLink: googleMapsLink || null,
        googleMapsThumbnail: googleMapsThumbnail || null,

        youtubeLink: youtubeLink || null,
        youtubeThumbnail: youtubeThumbnail || null,

        topographyPoints: topographyPoints || null,

        bedrooms,
        bathrooms,
        parkingSpaces,
        suites,

        furnished,
        condominium,
        condominiumFee,

        acceptsFinancing,
        frontSea,
        pool,

        images: {
          create: images.map((imageUrl: string, index: number) => ({
            imageUrl,
            sortOrder: index,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (error: any) {
    console.error("ERRO /api/anunciar:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro interno.",
      },
      { status: 500 }
    );
  }
}