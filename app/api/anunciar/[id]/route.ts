import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = Number(id);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: "Anúncio não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao carregar anúncio." },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const propertyId = Number(id);
    const body = await req.json();

    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price || 0);

    if (!title || !description || !price) {
      return NextResponse.json(
        { success: false, error: "Título, descrição e preço são obrigatórios." },
        { status: 400 }
      );
    }

    await prisma.propertyImage.deleteMany({
      where: { propertyId },
    });

    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        category: String(body.category || "").trim() || null,
        propertyType: String(body.property_type || "").trim() || null,
        title,
        description,
        price,
        legalStatus: String(body.legal_status || "").trim(),
        area: String(body.area_total || "").trim(),
        areaBuilt: String(body.area_built || "").trim() || null,
        bedrooms: body.bedrooms ? Number(body.bedrooms) : null,
        bathrooms: body.bathrooms ? Number(body.bathrooms) : null,
        parkingSpaces: body.parking_spaces ? Number(body.parking_spaces) : null,
        suites: body.suites ? Number(body.suites) : null,
        furnished: Boolean(body.furnished),
        condominium: Boolean(body.condominium),
        condominiumFee: body.condominium_fee
          ? Number(body.condominium_fee)
          : null,
        acceptsFinancing: Boolean(body.accepts_financing),
        frontSea: Boolean(body.front_sea),
        pool: Boolean(body.pool),

        country: String(body.country || "").trim() || null,
        state: String(body.state || "").trim() || null,
        city: String(body.city || "").trim(),
        neighborhood: String(body.neighborhood || "").trim() || null,
        street: String(body.street || "").trim() || null,
        addressNumber: String(body.address_number || "").trim() || null,
        zipCode: String(body.zip_code || "").trim() || null,

        googleMapsLink: String(body.google_maps_link || "").trim() || null,
        googleMapsThumbnail:
          String(body.google_maps_thumbnail || "").trim() || null,

        youtubeLink: String(body.youtube_link || "").trim() || null,
        youtubeThumbnail: String(body.youtube_thumbnail || "").trim() || null,

        topographyPoints:
          String(body.topography_points || "").trim() || null,

        latitude: Number(body.latitude),
        longitude: Number(body.longitude),

        images: {
          create: (body.images || []).map((imageUrl: string, index: number) => ({
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
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao atualizar anúncio." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const propertyId = Number(id);

    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property) {
      return NextResponse.json({ success: false, error: "Anúncio não encontrado." }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (property.ownerId !== user?.id) {
       return NextResponse.json({ success: false, error: "Você não tem permissão para excluir este anúncio." }, { status: 403 });
    }

    // Cascade deletion manually
    await prisma.propertyImage.deleteMany({ where: { propertyId } });
    
    // Deletar ofertas e pagamentos precisa ser feito caso existam
    await prisma.offerPayment.deleteMany({ where: { propertyId } });
    await prisma.offer.deleteMany({ where: { propertyId } });

    await prisma.property.delete({
      where: { id: propertyId }
    });

    return NextResponse.json({
      success: true
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Erro ao excluir anúncio." },
      { status: 500 }
    );
  }
}
