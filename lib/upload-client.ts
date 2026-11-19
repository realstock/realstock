/**
 * Utilitário de upload com suporte a Direct Signed Upload para o Supabase Storage.
 * Bypassa o limite de 4.5 MB da Vercel para vídeos de até 60s/200MB e provê progresso em tempo real.
 */

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const isVideo =
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i.test(file.name);

  const isLarge = file.size > 3.5 * 1024 * 1024; // > 3.5 MB

  // Qualquer vídeo ou arquivo acima de 3.5MB deve ser enviado diretamente ao Supabase Storage via signed URL
  if (isVideo || isLarge) {
    if (onProgress) onProgress(2);

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

    if (onProgress) onProgress(5);

    // 2. Upload direto ao Supabase Storage via PUT
    const formData = new FormData();
    formData.append("cacheControl", "3600");
    formData.append("", file, file.name);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signData.signedUrl);
      xhr.setRequestHeader("x-upsert", "true");

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable && e.total > 0) {
            // Mapeia 5% a 98% durante a transmissão dos bytes
            const pct = 5 + Math.round((e.loaded / e.total) * 93);
            onProgress(Math.min(98, pct));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`Falha no armazenamento do vídeo (${xhr.status}).`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Falha na rede durante o envio do arquivo. Verifique sua conexão."));
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
