import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL missing" }, { status: 400 });
  }

  // 1. Extrair cabeçalho Range da requisição do navegador (essencial para o Safari)
  const rangeHeader = req.headers.get("range");

  try {
    const headersToSend = new Headers();
    headersToSend.set(
      "User-Agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    );
    
    if (rangeHeader) {
      headersToSend.set("range", rangeHeader);
    }

    // 2. Fazer requisição à origem (ex: Supabase) repassando o Range
    const response = await fetch(url, {
      headers: headersToSend,
    });

    // 3. Montar cabeçalhos de resposta
    const responseHeaders = new Headers();
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    
    const contentType = response.headers.get("Content-Type") || "video/webm";
    responseHeaders.set("Content-Type", contentType);

    const contentLength = response.headers.get("Content-Length");
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const contentRange = response.headers.get("Content-Range");
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    // Se a origem retornou 206 (Partial Content), respondemos com 206 para manter a compatibilidade
    const status = response.status === 206 ? 206 : 200;

    return new NextResponse(response.body, {
      status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy video error:", error);
    return NextResponse.json({ error: "Failed to proxy video" }, { status: 500 });
  }
}
