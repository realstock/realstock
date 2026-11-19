import { compressVideoInBrowser } from "@/lib/video-compressor";

/**
 * Utilitário de upload com suporte a Direct Signed Upload para o Supabase Storage.
 * Bypassa o limite de 4.5 MB da Vercel.
 * Se o vídeo for maior que 50 MB, realiza a otimização e redução de resolução/bitrate
 * automaticamente no navegador antes do upload, com acompanhamento de progresso em duas etapas.
 */

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number, message?: string) => void
): Promise<string> {
  const isVideo =
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i.test(file.name);

  let isCompressed = false;

  // 1. OTIMIZAÇÃO AUTOMÁTICA SE VÍDEO FOR MAIOR QUE 50MB
  if (isVideo && file.size > 50 * 1024 * 1024) {
    const originalMb = (file.size / (1024 * 1024)).toFixed(1);
    if (onProgress) {
      onProgress(2, `Vídeo de ${originalMb} MB detectado. Otimizando qualidade e tamanho para envio...`);
    }

    try {
      const compressed = await compressVideoInBrowser(file, (compressPct, stageMsg) => {
        // Mapeia a fase de compressão de 2% a 48% do progresso total
        const mappedPct = 2 + Math.round((compressPct / 100) * 46);
        if (onProgress) {
          onProgress(mappedPct, stageMsg || `Reduzindo tamanho do vídeo (${compressPct}%)...`);
        }
      });
      file = compressed;
      isCompressed = true;
    } catch (compressErr: any) {
      console.error("Falha na otimização do vídeo:", compressErr);
      throw new Error(
        `O vídeo possui ${originalMb} MB e não pôde ser reduzido automaticamente pelo navegador. Erro: ${compressErr?.message || compressErr}`
      );
    }
  } else if (!isVideo && file.size > 50 * 1024 * 1024) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `O arquivo "${file.name}" possui ${sizeMb} MB e ultrapassa o limite de 50 MB permitido pelo armazenamento.`
    );
  }

  const isLarge = file.size > 3.5 * 1024 * 1024; // > 3.5 MB

  // Qualquer vídeo ou arquivo acima de 3.5MB deve ser enviado diretamente ao Supabase Storage via signed URL
  if (isVideo || isLarge) {
    const baseProgress = isCompressed ? 50 : 5;
    const progressSpan = isCompressed ? 45 : 90;

    if (onProgress) {
      onProgress(baseProgress, isCompressed ? "Iniciando envio do vídeo otimizado..." : "Preparando envio seguro...");
    }

    // 1. Obter URL assinada
    const signRes = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sign-url",
        fileName: file.name,
        fileType: file.type || (isVideo ? "video/mp4" : "application/octet-stream"),
        fileSize: file.size,
      }),
    });

    if (!signRes.ok) {
      let errText = "Erro ao obter permissão de envio.";
      try {
        const errJson = await signRes.json();
        errText = errJson.error || errText;
      } catch (_) {}
      throw new Error(errText);
    }

    const signData = await signRes.json();
    if (!signData.success || !signData.signedUrl) {
      throw new Error(signData.error || "Erro ao obter permissão de envio para o arquivo.");
    }

    // 2. Upload direto ao Supabase Storage via PUT
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file, file.name);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signData.signedUrl);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.timeout = 300000; // 5 minutos de tempo limite

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            const uploadPct = Math.round((e.loaded / e.total) * 100);
            const overallPct = baseProgress + Math.round((e.loaded / e.total) * progressSpan);
            const statusMsg = isCompressed
              ? `Enviando vídeo otimizado (${uploadPct}%)...`
              : `Enviando vídeo (${uploadPct}%)...`;
            onProgress(Math.min(isCompressed ? 96 : 95, overallPct), statusMsg);
          }
        };

        xhr.upload.onloadend = () => {
          // Todos os bytes foram enviados ao servidor; aguardando processamento e confirmação
          if (onProgress) {
            onProgress(99, "Finalizando salvamento no servidor...");
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100, "Concluído!");
          resolve();
        } else {
          let errMsg = `Falha no armazenamento do vídeo (${xhr.status}).`;
          try {
            const errObj = JSON.parse(xhr.responseText);
            if (errObj.message) errMsg = errObj.message;
            else if (errObj.error) errMsg = errObj.error;
          } catch (_) {}

          if (
            xhr.status === 413 ||
            errMsg.includes("exceeded the maximum") ||
            errMsg.includes("Payload too large")
          ) {
            errMsg = `O arquivo possui ${(file.size / (1024 * 1024)).toFixed(1)} MB e ultrapassou o limite máximo de 50 MB do servidor. Por favor, reduza a resolução ou duração do vídeo.`;
          }

          reject(new Error(errMsg));
        }
      };

      xhr.ontimeout = () => {
        reject(
          new Error(
            "O envio do vídeo demorou mais do que o esperado (tempo limite esgotado). Verifique sua conexão e tente novamente."
          )
        );
      };

      xhr.onerror = () => {
        reject(
          new Error("Falha na rede durante o envio do arquivo. Verifique sua conexão de internet.")
        );
      };

      xhr.send(formData);
    });

    return signData.publicUrl;
  }

  // 3. Fallback para arquivos menores (<= 3.5 MB)
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload-image", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let errText = "Falha no envio do arquivo.";
    try {
      const errJson = await res.json();
      errText = errJson.error || errText;
    } catch (_) {}
    throw new Error(errText);
  }

  const data = await res.json();
  if (data.success && (data.imageUrl || data.url)) {
    if (onProgress) onProgress(100);
    return data.imageUrl || data.url;
  }

  throw new Error(data.error || "Falha ao enviar arquivo.");
}
