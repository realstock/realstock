import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "ID e Status são obrigatórios" }, { status: 400 });
    }

    const updatedEmail = await prisma.emailMessage.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, email: updatedEmail });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
