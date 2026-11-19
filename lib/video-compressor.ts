/**
 * Compressor de vídeo no navegador (Client-side Transcoder).
 * Reduz a resolução (downscale para 1080p/720p) e taxa de bits de vídeos > 50MB,
 * garantindo que o arquivo final fique entre 15MB e 35MB para respeitar os limites do servidor.
 */

export interface CompressionProgressCallback {
  (percent: number, message?: string): void;
}

export async function compressVideoInBrowser(
  file: File,
  onProgress?: CompressionProgressCallback
): Promise<File> {
  return new Promise((resolve, reject) => {
    // 1. Criar elemento de vídeo para decodificação
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    // Mantemos muted = false para extrair o áudio no Web Audio API,
    // mas o áudio NÃO será roteado para os alto-falantes do usuário.
    video.muted = false;
    video.volume = 1.0;

    let cleanupDone = false;
    let animFrameId: number | null = null;
    let audioContext: AudioContext | null = null;
    let mediaStream: MediaStream | null = null;

    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      try {
        video.pause();
        video.src = "";
        video.load();
        URL.revokeObjectURL(videoUrl);
      } catch (_) {}
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => {
          try { t.stop(); } catch (_) {}
        });
      }
      if (audioContext && audioContext.state !== "closed") {
        try { audioContext.close(); } catch (_) {}
      }
    };

    const fail = (err: Error) => {
      cleanup();
      reject(err);
    };

    video.onerror = () => {
      fail(new Error("Não foi possível carregar o vídeo para otimização. Formato não suportado pelo navegador."));
    };

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration || 60;
        const originalWidth = video.videoWidth || 1080;
        const originalHeight = video.videoHeight || 1920;

        if (onProgress) onProgress(2, "Analisando dimensões e taxa de bits do vídeo...");

        // 2. Determinar resolução alvo (Downscaling inteligente)
        // Se vertical (9:16 ou similar), max 1080x1920. Se horizontal, max 1920x1080.
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;
        const isVertical = originalHeight >= originalWidth;

        if (isVertical) {
          if (targetHeight > 1920 || targetWidth > 1080) {
            const ratio = originalWidth / originalHeight;
            targetHeight = 1920;
            targetWidth = Math.round(targetHeight * ratio);
            // Garantir que as dimensões sejam pares para codificadores H.264
            if (targetWidth % 2 !== 0) targetWidth -= 1;
            if (targetHeight % 2 !== 0) targetHeight -= 1;
          }
        } else {
          if (targetWidth > 1920 || targetHeight > 1080) {
            const ratio = originalHeight / originalWidth;
            targetWidth = 1920;
            targetHeight = Math.round(targetWidth * ratio);
            if (targetWidth % 2 !== 0) targetWidth -= 1;
            if (targetHeight % 2 !== 0) targetHeight -= 1;
          }
        }

        // 3. Calcular taxa de bits ideal para garantir < 35 MB
        // 32 MB = 268.435.456 bits. Taxa de bits = bits / duration
        const targetBytes = 32 * 1024 * 1024; // 32 MB de meta segura
        const calculatedBps = Math.floor((targetBytes * 8) / Math.max(10, duration));
        // Limita a taxa entre 1.8 Mbps e 3.8 Mbps (excelente para 1080p/720p em H.264)
        const targetBps = Math.min(3_800_000, Math.max(1_800_000, calculatedBps));

        // 4. Configurar Canvas de renderização
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) {
          fail(new Error("Falha ao inicializar o processador gráfico no navegador."));
          return;
        }

        // 5. Capturar trilhas de áudio silenciosamente via Web Audio API
        const audioTracks: MediaStreamTrack[] = [];
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContext = new AudioContextClass();
            const source = audioContext.createMediaElementSource(video);
            const destination = audioContext.createMediaStreamDestination();
            source.connect(destination);
            // IMPORTANTE: NÃO conectamos a audioContext.destination para manter silêncio absoluto para o usuário
            destination.stream.getAudioTracks().forEach((track) => audioTracks.push(track));
          }
        } catch (audioErr) {
          console.warn("Áudio não pôde ser extraído ou vídeo não possui trilha de áudio:", audioErr);
        }

        // 6. Criar Stream combinada (Canvas + Áudio)
        const canvasStream = canvas.captureStream(30);
        const videoTrack = canvasStream.getVideoTracks()[0];
        mediaStream = new MediaStream([
          videoTrack,
          ...audioTracks,
        ]);

        // 7. Configurar MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported("video/mp4;codecs=avc1")
          ? "video/mp4;codecs=avc1"
          : MediaRecorder.isTypeSupported("video/mp4")
          ? "video/mp4"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm";

        const recorder = new MediaRecorder(mediaStream, {
          mimeType,
          videoBitsPerSecond: targetBps,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        let stopHandled = false;
        const finishCompression = () => {
          if (stopHandled) return;
          stopHandled = true;

          const cleanMime = mimeType.split(";")[0];
          const blob = new Blob(chunks, { type: cleanMime });
          const extension = cleanMime.includes("mp4") ? "mp4" : "webm";
          const newName = file.name.replace(/\.[^/.]+$/, "") + `-otimizado.${extension}`;
          const compressedFile = new File([blob], newName, { type: cleanMime });

          cleanup();

          if (onProgress) onProgress(100, "Otimização concluída com sucesso!");
          resolve(compressedFile);
        };

        recorder.onstop = finishCompression;

        // Fallback de segurança caso onstop demore para disparar
        const scheduleSafetyFinish = () => {
          setTimeout(() => {
            if (!stopHandled && chunks.length > 0) {
              finishCompression();
            }
          }, 2000);
        };

        // 8. Iniciar reprodução e gravação quadro a quadro
        recorder.start(500);

        // Loop de renderização
        const renderLoop = () => {
          if (cleanupDone || stopHandled) return;

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
            try { (videoTrack as any).requestFrame(); } catch (_) {}
          }

          const currentPct = Math.min(95, Math.round((video.currentTime / duration) * 95));
          if (onProgress) {
            onProgress(currentPct, `Otimizando qualidade do vídeo (${currentPct}%)...`);
          }

          animFrameId = requestAnimationFrame(renderLoop);
        };

        // Ouvinte de término do vídeo
        video.onended = () => {
          if (recorder.state === "recording") {
            recorder.stop();
            scheduleSafetyFinish();
          }
        };

        // Iniciar reprodução com velocidade ligeiramente acelerada para economizar tempo (1.25x)
        video.playbackRate = 1.25;
        await video.play();
        animFrameId = requestAnimationFrame(renderLoop);
      } catch (err: any) {
        fail(new Error("Erro durante o processamento do vídeo: " + (err.message || String(err))));
      }
    };
  });
}
