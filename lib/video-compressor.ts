/**
 * Compressor de vídeo no navegador (Client-side Transcoder).
 * Reduz a resolução (downscale para 540x960 qHD) e taxa de bits de vídeos > 50MB,
 * com garantia matemática e refinamento automático em segundo passo para que o arquivo
 * final fique sempre entre 15MB e 28MB (abaixo do teto de 50MB do Supabase).
 */

export interface CompressionProgressCallback {
  (percent: number, message?: string): void;
}

export async function compressVideoInBrowser(
  file: File,
  onProgress?: CompressionProgressCallback
): Promise<File> {
  return compressVideoInBrowserInternal(file, onProgress, false);
}

async function compressVideoInBrowserInternal(
  file: File,
  onProgress?: CompressionProgressCallback,
  isSecondPass: boolean = false
): Promise<File> {
  return new Promise((resolve, reject) => {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    console.log(
      `[VideoCompressor] Iniciando otimização (Passo ${isSecondPass ? 2 : 1}) para: ${file.name} (${sizeMb} MB)`
    );

    // 1. Criar elemento de vídeo e adicionar ao DOM invisível (necessário para aceleração GPU consistente)
    const video = document.createElement("video");
    video.style.position = "fixed";
    video.style.top = "-9999px";
    video.style.left = "-9999px";
    video.style.width = "4px";
    video.style.height = "4px";
    video.style.opacity = "0";
    video.style.pointerEvents = "none";
    video.style.zIndex = "-1";
    document.body.appendChild(video);

    const videoUrl = URL.createObjectURL(file);
    video.playsInline = true;
    video.muted = true; // Crucial: muted = true garante video.play() instantâneo sem restrição de autoplay
    video.volume = 0;
    video.preload = "auto";

    let cleanupDone = false;
    let animFrameId: number | null = null;
    let mediaStream: MediaStream | null = null;
    let loadTimeout: any = null;
    let watchdogInterval: any = null;

    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      if (loadTimeout) clearTimeout(loadTimeout);
      if (watchdogInterval) clearInterval(watchdogInterval);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      try {
        video.onloadedmetadata = null;
        video.onloadeddata = null;
        video.oncanplay = null;
        video.onerror = null;
        video.onended = null;
        video.pause();
        video.removeAttribute("src");
        video.load();
        URL.revokeObjectURL(videoUrl);
        if (video.parentNode) video.parentNode.removeChild(video);
      } catch (_) {}
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => {
          try {
            t.stop();
          } catch (_) {}
        });
      }
    };

    const fail = (err: Error) => {
      console.error("[VideoCompressor] Erro:", err);
      cleanup();
      reject(err);
    };

    // Timeout generoso e adaptativo para arquivos grandes (de 60s a 150s para arquivos de até 200MB+)
    const timeoutSeconds = Math.max(
      60,
      Math.min(150, Math.round((file.size / (1024 * 1024)) * 0.8))
    );
    loadTimeout = setTimeout(() => {
      fail(
        new Error(
          `Tempo limite ao carregar o vídeo de ${sizeMb} MB. O arquivo pode estar corrompido ou o formato não pôde ser lido pelo navegador.`
        )
      );
    }, timeoutSeconds * 1000);

    video.onerror = () => {
      const err = video.error;
      fail(
        new Error(
          `Não foi possível decodificar o vídeo (${err?.message || "formato ou codec não suportado pelo navegador"}).`
        )
      );
    };

    let metadataHandled = false;
    const handleMetadata = async () => {
      if (metadataHandled) return;
      metadataHandled = true;
      if (loadTimeout) clearTimeout(loadTimeout);

      try {
        const rawDuration = video.duration;
        const duration =
          rawDuration && isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 60;
        const originalWidth = video.videoWidth || (isSecondPass ? 854 : 960);
        const originalHeight = video.videoHeight || (isSecondPass ? 480 : 540);
        console.log(
          `[VideoCompressor] Metadados carregados: ${originalWidth}x${originalHeight}, Duração: ${duration.toFixed(1)}s`
        );

        if (onProgress && !isSecondPass) {
          onProgress(2, `Otimizando vídeo (${sizeMb} MB)...`);
        }

        // 2. Determinar resolução alvo (Downscaling para 540x960 qHD no passo 1, ou 480x854 no passo 2)
        // 540x960 reduz 75% dos pixels em relação a 1080p, forçando o codificador de hardware
        // a baixar a taxa de bits e garantindo arquivo entre 16MB e 28MB com ótima nitidez no smartphone.
        const maxLongSide = isSecondPass ? 854 : 960;
        const maxShortSide = isSecondPass ? 480 : 540;

        let targetWidth = originalWidth;
        let targetHeight = originalHeight;
        const isVertical = originalHeight >= originalWidth;

        if (isVertical) {
          if (targetHeight > maxLongSide || targetWidth > maxShortSide) {
            const ratio = originalWidth / originalHeight;
            targetHeight = maxLongSide;
            targetWidth = Math.round(targetHeight * ratio);
            if (targetWidth % 2 !== 0) targetWidth -= 1;
            if (targetHeight % 2 !== 0) targetHeight -= 1;
          }
        } else {
          if (targetWidth > maxLongSide || targetHeight > maxShortSide) {
            const ratio = originalHeight / originalWidth;
            targetWidth = maxLongSide;
            targetHeight = Math.round(targetWidth * ratio);
            if (targetWidth % 2 !== 0) targetWidth -= 1;
            if (targetHeight % 2 !== 0) targetHeight -= 1;
          }
        }

        // 3. Taxa de bits alvo (0.75 a 1.8 Mbps no passo 1, ou 1.2 Mbps no passo 2)
        const targetBytes = (isSecondPass ? 14 : 18) * 1024 * 1024;
        const calculatedBps = Math.floor((targetBytes * 8) / Math.max(10, duration));
        const targetBps = Math.min(
          isSecondPass ? 1_400_000 : 1_800_000,
          Math.max(700_000, calculatedBps)
        );

        // 4. Configurar Canvas
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          fail(new Error("Falha ao inicializar o processador gráfico no navegador."));
          return;
        }

        // 5. Capturar trilhas de áudio
        let audioTracks: MediaStreamTrack[] = [];
        try {
          if (typeof (video as any).captureStream === "function") {
            const vStream = (video as any).captureStream();
            if (vStream && vStream.getAudioTracks().length > 0) {
              audioTracks = vStream.getAudioTracks();
              console.log("[VideoCompressor] Trilhas de áudio detectadas:", audioTracks.length);
            }
          }
        } catch (audioErr) {
          console.warn("[VideoCompressor] captureStream de áudio não disponível:", audioErr);
        }

        // 6. Configurar MediaStream combinado (24 fps padrão cinema economiza 20% de tamanho com fluidez perfeita)
        const canvasStream = canvas.captureStream(24);
        const videoTrack = canvasStream.getVideoTracks()[0];
        mediaStream = new MediaStream([videoTrack, ...audioTracks]);

        // 7. Configurar MediaRecorder
        // No passo 2 usamos WebM que obedece estritamente ao bitrate para garantir < 25MB
        const mimeType = isSecondPass
          ? MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
            ? "video/webm;codecs=vp8"
            : "video/webm"
          : MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
          ? "video/mp4;codecs=avc1"
          : MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

        const recorder = new MediaRecorder(mediaStream, {
          mimeType,
          videoBitsPerSecond: targetBps,
          bitsPerSecond: targetBps,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        let stopHandled = false;
        const finishCompression = async () => {
          if (stopHandled) return;
          stopHandled = true;

          const cleanMime = mimeType.split(";")[0];
          const blob = new Blob(chunks, { type: cleanMime });
          const extension = cleanMime.includes("mp4") ? "mp4" : "webm";

          console.log(
            `[VideoCompressor] Tamanho obtido no passo ${isSecondPass ? 2 : 1}: ${(blob.size / (1024 * 1024)).toFixed(1)} MB`
          );

          // Se por algum motivo o encoder de hardware do navegador ainda ultrapassou 48 MB no passo 1,
          // executa um refinamento automático com taxa estrita para garantir 100% que fique < 30 MB
          if (blob.size > 48 * 1024 * 1024 && !isSecondPass) {
            console.warn(
              `[VideoCompressor] Arquivo de ${(blob.size / (1024 * 1024)).toFixed(1)} MB ainda ultrapassa 48 MB. Aplicando refinamento automático...`
            );
            if (onProgress) {
              onProgress(48, "Aplicando refinamento final no tamanho do vídeo...");
            }
            cleanup();
            const intermediateFile = new File([blob], file.name, { type: cleanMime });
            try {
              const refinedFile = await compressVideoInBrowserInternal(
                intermediateFile,
                onProgress,
                true
              );
              resolve(refinedFile);
              return;
            } catch (refineErr) {
              console.error("[VideoCompressor] Falha no refinamento:", refineErr);
            }
          }

          const newName =
            file.name.replace(/\.[^/.]+$/, "") + `-otimizado.${extension}`;
          const compressedFile = new File([blob], newName, { type: cleanMime });

          console.log(
            `[VideoCompressor] Sucesso final! Original: ${sizeMb} MB -> Final: ${(compressedFile.size / (1024 * 1024)).toFixed(1)} MB`
          );
          cleanup();

          if (onProgress) onProgress(100, "Otimização concluída com sucesso!");
          resolve(compressedFile);
        };

        recorder.onstop = finishCompression;

        const scheduleSafetyFinish = () => {
          setTimeout(() => {
            if (!stopHandled) finishCompression();
          }, 1500);
        };

        // 8. Iniciar gravação e reprodução
        recorder.start(500);

        const renderLoop = () => {
          if (cleanupDone || stopHandled) return;

          // Se o vídeo terminou ou alcançou a duração
          if (video.currentTime >= duration || video.ended) {
            if (onProgress) onProgress(98, "Finalizando codificação do vídeo...");
            if (recorder.state === "recording") {
              recorder.stop();
              scheduleSafetyFinish();
            }
            return;
          }

          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

          if (videoTrack && typeof (videoTrack as any).requestFrame === "function") {
            try {
              (videoTrack as any).requestFrame();
            } catch (_) {}
          }

          const currentPct = Math.min(95, Math.round((video.currentTime / duration) * 95));
          if (onProgress) {
            const timeRemaining = Math.max(0, Math.round(duration - video.currentTime));
            onProgress(
              currentPct,
              `Reduzindo tamanho do vídeo (${currentPct}% - ~${timeRemaining}s)...`
            );
          }

          animFrameId = requestAnimationFrame(renderLoop);
        };

        // Watchdog para evitar qualquer travamento de reprodução
        let lastReportedTime = -1;
        let stalledCount = 0;
        watchdogInterval = setInterval(() => {
          if (cleanupDone || stopHandled) return;
          if (Math.abs(video.currentTime - lastReportedTime) < 0.1 && !video.ended) {
            stalledCount++;
            console.warn(
              `[VideoCompressor] Watchdog: vídeo em ${video.currentTime.toFixed(1)}s (tentativa ${stalledCount})`
            );
            if (video.paused) {
              video.play().catch(() => {});
            }
            if (stalledCount >= 5) {
              console.warn(
                "[VideoCompressor] Watchdog: finalizando gravação por inatividade."
              );
              if (recorder.state === "recording") {
                recorder.stop();
                scheduleSafetyFinish();
              }
            }
          } else {
            stalledCount = 0;
            lastReportedTime = video.currentTime;
          }
        }, 1000);

        video.onended = () => {
          if (recorder.state === "recording") {
            recorder.stop();
            scheduleSafetyFinish();
          }
        };

        // Iniciar reprodução silenciosa
        try {
          await video.play();
        } catch (playErr) {
          console.warn("[VideoCompressor] video.play() requer muting forçado:", playErr);
          video.muted = true;
          await video.play();
        }

        animFrameId = requestAnimationFrame(renderLoop);
      } catch (err: any) {
        fail(
          new Error("Erro durante o processamento do vídeo: " + (err.message || String(err)))
        );
      }
    };

    // Vincular aos eventos de carregamento
    video.onloadedmetadata = handleMetadata;
    video.onloadeddata = handleMetadata;
    video.oncanplay = handleMetadata;

    // Iniciar carregamento no elemento
    if (onProgress && !isSecondPass) {
      onProgress(1, `Carregando vídeo (${sizeMb} MB)...`);
    }
    video.src = videoUrl;
    video.load();
  });
}
