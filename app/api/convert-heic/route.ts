import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { writeFile, readFile, unlink } from "fs/promises";
import { promisify } from "util";
import path from "path";
import os from "os";

const execPromise = promisify(exec);

export async function POST(req: NextRequest) {
  const tmpInput = path.join(os.tmpdir(), `input_${Date.now()}_${Math.random().toString(36).substring(7)}.heic`);
  const tmpOutput = path.join(os.tmpdir(), `output_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tmpInput, buffer);

    // Usa o motor nativo do Mac (SIPS) para converter HEIC para JPG
    // SIPS é o motor oficial da Apple, 100% compatível com fotos do iPhone
    await execPromise(`sips -s format jpeg "${tmpInput}" --out "${tmpOutput}"`);

    const convertedBuffer = await readFile(tmpOutput);

    // Limpeza dos arquivos temporários
    await unlink(tmpInput).catch(() => {});
    await unlink(tmpOutput).catch(() => {});

    return new NextResponse(convertedBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${file.name.replace(/\.[^.]+$/, "")}.jpg"`,
      },
    });
  } catch (error: any) {
    console.error("Erro na conversão SIPS no Mac:", error);
    
    // Tenta limpar se falhar
    await unlink(tmpInput).catch(() => {});
    await unlink(tmpOutput).catch(() => {});

    return NextResponse.json({ 
      success: false, 
      error: "Falha no motor Apple (SIPS): " + error.message,
      details: error.stack 
    }, { status: 500 });
  }
}
