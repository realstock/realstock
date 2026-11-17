/**
 * REELS STUDIO ENGINE - REALSTOCK
 * Motor de renderização cinematográfica em HTML5 Canvas para geração de Reels profissionais.
 * Suporta transições modernas (Zoom Punch, Whip Pan, Flash, Crossfade, Blur),
 * movimentos de câmera Ken Burns, legendas dinâmicas, barra de progresso e áudio sincronizado.
 */

export type TransitionType = 
  | "smart_mix" 
  | "zoom_punch" 
  | "whip_pan" 
  | "flash" 
  | "crossfade" 
  | "blur_dissolve";

export type KenBurnsEffect = 
  | "push_in" 
  | "pan_left" 
  | "pull_out" 
  | "pan_right" 
  | "subtle_float";

export type PacingDuration = 15 | 30 | 59;

export interface SceneCaption {
  headline: string;
  sub: string;
}

export interface ReelsScriptConfig {
  hook: string;
  subtitle: string;
  priceTag: string;
  featureBadge: string;
  scenes: SceneCaption[];
  cta: string;
}

export interface ReelsRenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  durationSeconds?: PacingDuration;
  transitionType?: TransitionType;
  listingType?: "ALUGUEL_TEMPORADA" | "COMPRA_VENDA" | string | null;
  script?: ReelsScriptConfig;
  showProgressBar?: boolean;
  showPriceBadge?: boolean;
  showCaptions?: boolean;
  watermarkText?: string;
}

export interface LoadedMediaItem {
  type: "image" | "video";
  element: HTMLImageElement | HTMLVideoElement;
  width: number;
  height: number;
  duration?: number;
}

// Helpers de Easing
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

/**
 * Desenha uma imagem ou frame de vídeo aplicando movimento de câmera Ken Burns.
 */
function drawMediaWithKenBurns(
  ctx: CanvasRenderingContext2D,
  media: LoadedMediaItem,
  width: number,
  height: number,
  progress: number, // 0.0 a 1.0 no tempo do clipe
  effect: KenBurnsEffect,
  alpha = 1.0,
  extraScale = 1.0,
  offsetX = 0,
  offsetY = 0
) {
  if (alpha <= 0.001) return;

  // Se for elemento de vídeo, sincronizar frame de tempo se necessário
  if (media.type === "video" && media.element instanceof HTMLVideoElement) {
    const vid = media.element;
    const dur = vid.duration || media.duration || 5;
    const targetTime = (progress * dur) % dur;
    if (Math.abs(vid.currentTime - targetTime) > 0.12) {
      vid.currentTime = targetTime;
    }
  }

  if (!media || !media.element) return;

  const rawW = media.width || (media.element instanceof HTMLVideoElement ? media.element.videoWidth : (media.element as HTMLImageElement).naturalWidth) || 1200;
  const rawH = media.height || (media.element instanceof HTMLVideoElement ? media.element.videoHeight : (media.element as HTMLImageElement).naturalHeight) || 800;
  const mWidth = rawW > 0 ? rawW : 1200;
  const mHeight = rawH > 0 ? rawH : 800;
  const baseScale = Math.max(width / mWidth, height / mHeight);

  // Calcula escala e translação baseado no efeito
  let scale = baseScale * extraScale;
  let tx = 0;
  let ty = 0;

  switch (effect) {
    case "push_in":
      scale *= 1.0 + progress * 0.12;
      break;
    case "pull_out":
      scale *= 1.15 - progress * 0.12;
      break;
    case "pan_left":
      scale *= 1.12;
      tx = -(progress * 50);
      break;
    case "pan_right":
      scale *= 1.12;
      tx = -50 + progress * 50;
      break;
    case "subtle_float":
      scale *= 1.08 + Math.sin(progress * Math.PI) * 0.04;
      ty = Math.sin(progress * Math.PI) * 15;
      break;
  }

  const dW = mWidth * scale;
  const dH = mHeight * scale;
  const x = (width - dW) / 2 + tx + offsetX;
  const y = (height - dH) / 2 + ty + offsetY;

  try {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.drawImage(media.element, x, y, dW, dH);
    ctx.restore();
  } catch (e) {
    try {
      ctx.restore();
    } catch (_) {}
  }
}

/**
 * Executa a transição entre cena A e cena B.
 */
function drawSceneTransition(
  ctx: CanvasRenderingContext2D,
  currentMedia: LoadedMediaItem,
  nextMedia: LoadedMediaItem,
  width: number,
  height: number,
  transitionProgress: number, // 0.0 a 1.0
  type: TransitionType,
  currentEffect: KenBurnsEffect,
  nextEffect: KenBurnsEffect,
  sceneIndex: number
) {
  if (!currentMedia || !nextMedia) {
    if (currentMedia) {
      drawMediaWithKenBurns(ctx, currentMedia, width, height, 1.0, currentEffect);
    }
    return;
  }

  let effectiveType = type;
  if (type === "smart_mix") {
    const sequence: TransitionType[] = ["zoom_punch", "crossfade", "whip_pan", "flash", "blur_dissolve"];
    effectiveType = sequence[sceneIndex % sequence.length];
  }

  const t = Math.max(0, Math.min(1, transitionProgress));

  switch (effectiveType) {
    case "zoom_punch": {
      // Cena A acelera dando zoom profundo e esmaecendo
      const tOut = easeInCubic(t);
      const scaleA = 1.0 + tOut * 0.55;
      const alphaA = 1.0 - tOut;
      drawMediaWithKenBurns(ctx, currentMedia, width, height, 1.0, currentEffect, alphaA, scaleA);

      // Cena B surge grande e pousa na escala normal
      const tIn = easeOutCubic(t);
      const scaleB = 1.35 - tIn * 0.35;
      const alphaB = tIn;
      drawMediaWithKenBurns(ctx, nextMedia, width, height, 0.0, nextEffect, alphaB, scaleB);
      break;
    }

    case "whip_pan": {
      // Deslize lateral veloz com leve motion offset
      const easeT = easeInOutQuad(t);
      const offsetA = -width * easeT;
      const offsetB = width * (1.0 - easeT);

      drawMediaWithKenBurns(ctx, currentMedia, width, height, 1.0, currentEffect, 1.0, 1.05, offsetA, 0);
      drawMediaWithKenBurns(ctx, nextMedia, width, height, 0.0, nextEffect, 1.0, 1.05, offsetB, 0);

      // Linha sutil de desfoque de movimento no ponto de maior velocidade
      if (t > 0.2 && t < 0.8) {
        ctx.save();
        const streakAlpha = Math.sin((t - 0.2) / 0.6 * Math.PI) * 0.25;
        ctx.fillStyle = `rgba(255, 255, 255, ${streakAlpha})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      break;
    }

    case "flash": {
      // Dissolve com explosão suave de luz branca
      const alphaA = 1.0 - t;
      const alphaB = t;
      drawMediaWithKenBurns(ctx, currentMedia, width, height, 1.0, currentEffect, alphaA);
      drawMediaWithKenBurns(ctx, nextMedia, width, height, 0.0, nextEffect, alphaB);

      // Flash branco que atinge o pico em t = 0.45
      const flashIntensity = Math.sin(t * Math.PI) * 0.65;
      if (flashIntensity > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
      break;
    }

    case "blur_dissolve": {
      // Simulação de desfoque cinematográfico renderizando cópias com pequenos deslocamentos
      const alphaA = 1.0 - t;
      const alphaB = t;

      if (t < 0.5) {
        const spread = t * 14;
        ctx.save();
        ctx.globalAlpha = alphaA * 0.5;
        drawMediaWithKenBurns(ctx, currentMedia, width, height, 1.0, currentEffect, alphaA * 0.5, 1.0, -spread, 0);
        drawMediaWithKenBurns(ctx, currentMedia, width, height, 1.0, currentEffect, alphaA * 0.5, 1.0, spread, 0);
        ctx.restore();
      } else {
        const spread = (1.0 - t) * 14;
        ctx.save();
        ctx.globalAlpha = alphaB * 0.5;
        drawMediaWithKenBurns(ctx, nextMedia, width, height, 0.0, nextEffect, alphaB * 0.5, 1.0, -spread, 0);
        drawMediaWithKenBurns(ctx, nextMedia, width, height, 0.0, nextEffect, alphaB * 0.5, 1.0, spread, 0);
        ctx.restore();
      }
      break;
    }

    case "crossfade":
    default: {
      drawMediaWithKenBurns(ctx, currentMedia, width, height, 1.0, currentEffect, 1.0 - t);
      drawMediaWithKenBurns(ctx, nextMedia, width, height, 0.0, nextEffect, t);
      break;
    }
  }
}

/**
 * Renderiza os overlays gráficos modernos (Barra de Progresso, Badges, Legendas Dinâmicas e Branding).
 */
export function renderReelsOverlays(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentTime: number,
  totalDuration: number,
  sceneIndex: number,
  totalScenes: number,
  sceneProgress: number, // 0.0 a 1.0 dentro da cena
  options: ReelsRenderOptions
) {
  const isSeasonal = options.listingType === "ALUGUEL_TEMPORADA";
  const script = options.script;

  // 1. Vinheta suave no topo e gradiente rico na base
  // Top vignette
  const topGrad = ctx.createLinearGradient(0, 0, 0, 180);
  topGrad.addColorStop(0, "rgba(0, 0, 0, 0.75)");
  topGrad.addColorStop(1, "transparent");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, 180);

  // Bottom rich gradient
  const botGrad = ctx.createLinearGradient(0, height * 0.55, 0, height);
  botGrad.addColorStop(0, "transparent");
  botGrad.addColorStop(0.5, "rgba(2, 6, 23, 0.65)");
  botGrad.addColorStop(1, "rgba(2, 6, 23, 0.95)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);

  // 2. Barra de Progresso no Topo (Segmentada estilo Instagram/TikTok)
  if (options.showProgressBar !== false) {
    const barTop = 24;
    const barHeight = 4;
    const padding = 16;
    const totalBarWidth = width - padding * 2;
    const gap = 4;
    const segmentWidth = (totalBarWidth - gap * (totalScenes - 1)) / totalScenes;

    for (let s = 0; s < totalScenes; s++) {
      const segX = padding + s * (segmentWidth + gap);
      
      // Fundo do segmento
      ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
      ctx.beginPath();
      ctx.roundRect(segX, barTop, segmentWidth, barHeight, 2);
      ctx.fill();

      // Preenchimento
      if (s < sceneIndex) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(segX, barTop, segmentWidth, barHeight, 2);
        ctx.fill();
      } else if (s === sceneIndex) {
        const fillW = segmentWidth * Math.max(0, Math.min(1, sceneProgress));
        if (fillW > 0) {
          ctx.fillStyle = isSeasonal ? "#38bdf8" : "#f59e0b"; // Sky blue para temporada, Gold para venda
          ctx.beginPath();
          ctx.roundRect(segX, barTop, fillW, barHeight, 2);
          ctx.fill();
        }
      }
    }
  }

  // 3. Top Header: Tag de Modalidade & Local
  const subtitleText = script?.subtitle || (isSeasonal ? "ALUGUEL POR TEMPORADA" : "IMÓVEL À VENDA");
  ctx.save();
  ctx.font = "bold 20px Inter, -apple-system, sans-serif";
  ctx.textAlign = "center";
  const subWidth = ctx.measureText(subtitleText).width + 36;
  const badgeX = (width - subWidth) / 2;
  const badgeY = 44;
  
  // Pill background glassmorphism
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.strokeStyle = isSeasonal ? "rgba(56, 189, 248, 0.4)" : "rgba(245, 158, 11, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, subWidth, 32, 16);
  ctx.fill();
  ctx.stroke();

  // Bullet indicador
  ctx.fillStyle = isSeasonal ? "#38bdf8" : "#f59e0b";
  ctx.beginPath();
  ctx.arc(badgeX + 16, badgeY + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  // Texto da modalidade
  ctx.fillStyle = "#ffffff";
  ctx.fillText(subtitleText, width / 2 + 6, badgeY + 22);
  ctx.restore();

  // 4. Badge Flutuante de Preço & Características (Posicionado no terço inferior superior)
  if (options.showPriceBadge !== false && script?.priceTag) {
    const priceBoxY = height - 320;
    
    ctx.save();
    // Preço destacado
    ctx.font = "900 36px Inter, -apple-system, sans-serif";
    ctx.textAlign = "center";
    const priceText = script.priceTag.toUpperCase();
    const priceTextW = ctx.measureText(priceText).width + 48;

    // Card de preço moderno
    const pX = (width - priceTextW) / 2;
    ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(pX, priceBoxY, priceTextW, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSeasonal ? "#38bdf8" : "#fbbf24";
    ctx.fillText(priceText, width / 2, priceBoxY + 36);

    // Destaques / Comodidades logo abaixo
    if (script.featureBadge) {
      ctx.font = "bold 20px Inter, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillText(script.featureBadge, width / 2, priceBoxY + 82);
    }
    ctx.restore();
  }

  // 5. Legendas Dinâmicas estilo Reels/TikTok por cena
  if (options.showCaptions !== false && script?.scenes && script.scenes.length > 0) {
    const currentScene = script.scenes[sceneIndex % script.scenes.length];
    
    // Animação de entrada suave da legenda (slide up + fade)
    const entryProgress = Math.min(1.0, sceneProgress * 4.0);
    const captionAlpha = easeOutCubic(entryProgress);
    const captionSlideY = (1.0 - entryProgress) * 20;

    const baseCaptionY = height - 200 + captionSlideY;

    ctx.save();
    ctx.globalAlpha = captionAlpha;
    ctx.textAlign = "center";

    // Headline da cena em destaque
    const headline = currentScene.headline.toUpperCase();
    ctx.font = "900 38px Inter, -apple-system, sans-serif";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 12;

    const headlineW = ctx.measureText(headline).width + 40;
    const headX = (width - headlineW) / 2;

    // Pill para headline
    ctx.fillStyle = isSeasonal ? "rgba(12, 74, 110, 0.85)" : "rgba(120, 53, 15, 0.85)";
    ctx.strokeStyle = isSeasonal ? "rgba(56, 189, 248, 0.6)" : "rgba(245, 158, 11, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(headX, baseCaptionY - 32, headlineW, 46, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillText(headline, width / 2, baseCaptionY + 2);

    // Subtítulo descritivo da cena
    if (currentScene.sub) {
      ctx.font = "600 24px Inter, -apple-system, sans-serif";
      ctx.fillStyle = "#f8fafc";
      ctx.shadowBlur = 8;
      ctx.fillText(currentScene.sub, width / 2, baseCaptionY + 48);
    }
    ctx.restore();
  }

  // 6. Rodapé com Selo RealStock & CTA
  const isClosing = currentTime >= totalDuration - 2.5; // Últimos 2.5 segundos
  ctx.save();
  ctx.textAlign = "center";

  if (isClosing && script?.cta) {
    // Efeito de CTA Final Animado
    ctx.font = "bold 28px Inter, -apple-system, sans-serif";
    ctx.fillStyle = isSeasonal ? "#38bdf8" : "#f59e0b";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    ctx.fillText(script.cta, width / 2, height - 75);
  } else {
    // Rodapé de credibilidade
    ctx.font = "bold 22px Inter, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText("www.realstock.com.br", width / 2, height - 75);
  }

  // Marca d'água discreta
  ctx.font = "600 16px Inter, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillText("REALSTOCK • ANÚNCIO VERIFICADO", width / 2, height - 42);
  ctx.restore();
}

/**
 * Renderiza um único quadro do Reel no Canvas para o instante de tempo especificado.
 * Utilizado tanto para visualização em tempo real (preview interativo) quanto para gravação.
 */
export function renderReelsFrame(
  ctx: CanvasRenderingContext2D,
  mediaItems: LoadedMediaItem[],
  width: number,
  height: number,
  currentTime: number,
  totalDuration: number,
  options: ReelsRenderOptions
) {
  if (mediaItems.length === 0) {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const fps = options.fps || 30;
  const totalScenes = mediaItems.length;
  const durationPerScene = totalDuration / totalScenes;
  const transitionDuration = Math.min(0.7, durationPerScene * 0.35); // Transição proporcional e suave

  const currentSceneIndex = Math.min(totalScenes - 1, Math.max(0, Math.floor(currentTime / durationPerScene)));
  const timeIntoScene = currentTime - currentSceneIndex * durationPerScene;
  const sceneProgress = Math.max(0, Math.min(1, timeIntoScene / durationPerScene));

  // Lista cíclica de movimentos de câmera
  const kenBurnsEffects: KenBurnsEffect[] = ["push_in", "pan_left", "pull_out", "pan_right", "subtle_float"];
  const currentEffect = kenBurnsEffects[currentSceneIndex % kenBurnsEffects.length];
  const nextEffect = kenBurnsEffects[(currentSceneIndex + 1) % kenBurnsEffects.length];

  // Limpa o canvas
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, width, height);

  const currentMedia = mediaItems[currentSceneIndex];
  const isTransitioning = timeIntoScene >= durationPerScene - transitionDuration && currentSceneIndex < totalScenes - 1;

  if (isTransitioning) {
    const nextMedia = mediaItems[currentSceneIndex + 1];
    const transProgress = (timeIntoScene - (durationPerScene - transitionDuration)) / transitionDuration;

    drawSceneTransition(
      ctx,
      currentMedia,
      nextMedia,
      width,
      height,
      transProgress,
      options.transitionType || "smart_mix",
      currentEffect,
      nextEffect,
      currentSceneIndex
    );
  } else {
    drawMediaWithKenBurns(
      ctx,
      currentMedia,
      width,
      height,
      sceneProgress,
      currentEffect
    );
  }

  // Renderiza todos os overlays profissionais
  renderReelsOverlays(
    ctx,
    width,
    height,
    currentTime,
    totalDuration,
    currentSceneIndex,
    totalScenes,
    sceneProgress,
    options
  );
}
