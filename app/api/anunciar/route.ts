import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("BODY RECEBIDO /api/anunciar:", body);

    // =============================
    // CAMPOS BÁSICOS
    // =============================
    const ownerId = Number(body.owner_id);

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);

    const legalStatus = String(body.legal_status || "").trim();
    const areaTotal = String(body.area_total || "").trim();
    const areaBuilt = String(body.area_built || "").trim();

    const category = String(body.category || "").trim();
    const propertyType = String(body.property_type || "").trim();

    // =============================
    // ENDEREÇO
    // =============================
    const country = String(body.country || "").trim();
    const stateName = String(body.state || "").trim();
    const city = String(body.city || "").trim();
    const neighborhood = String(body.neighborhood || "").trim();
    const street = String(body.street || "").trim();
    const addressNumber = String(body.address_number || "").trim();
    const zipCode = String(body.zip_code || "").trim();

    // =============================
    // GEO / MAPS
    // =============================
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    console.log("LAT/LNG RECEBIDOS:", {
    rawLatitude: body.latitude,
    rawLongitude: body.longitude,
    latitude,
    longitude,
  });
    const googleMapsLink = String(body.google_maps_link || "").trim();
    const googleMapsThumbnail = String(
      body.google_maps_thumbnail || ""
    ).trim();

    // =============================
    // MÍDIA
    // =============================
    const youtubeLink = String(body.youtube_link || "").trim();
    const youtubeThumbnail = String(body.youtube_thumbnail || "").trim();

    // =============================
    // TERRENOS
    // =============================
    const topographyPoints = String(body.topography_points || "").trim();

    // =============================
    // CARACTERÍSTICAS
    // =============================
    const bedrooms = body.bedrooms ? Number(body.bedrooms) : null;
    const bathrooms = body.bathrooms ? Number(body.bathrooms) : null;
    const parkingSpaces = body.parking_spaces
      ? Number(body.parking_spaces)
      : null;
    const suites = body.suites ? Number(body.suites) : null;

    const furnished = Boolean(body.furnished);
    const condominium = Boolean(body.condominium);
    const condominiumFee = body.condominium_fee
      ? Number(body.condominium_fee)
      : null;

    const acceptsFinancing = Boolean(body.accepts_financing);
    const frontSea = Boolean(body.front_sea);
    const pool = Boolean(body.pool);

    // =============================
    // IMAGENS
    // =============================
    const images: string[] = body.images || [];

    // =============================
    // VALIDAÇÕES
    // =============================
    if (!ownerId) {
      return NextResponse.json(
        { success: false, error: "Usuário inválido." },
        { status: 400 }
      );
    }

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

    // =============================
    // CREATE
    // =============================
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

    console.log("IMÓVEL CRIADO:", property.id);

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (error: any) {
    console.error("ERRO /api/anunciar:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno.",
      },
      { status: 500 }
    );
  }
}