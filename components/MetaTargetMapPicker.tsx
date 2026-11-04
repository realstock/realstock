"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Target, 
  MapPin, 
  RotateCcw, 
  Plus, 
  Minus, 
  ShieldCheck, 
  Users, 
  Sparkles,
  Compass
} from "lucide-react";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

interface MetaTargetMapPickerProps {
  initialLatitude: number;
  initialLongitude: number;
  initialRadiusKm?: number;
  propertyLocation?: {
    latitude: number;
    longitude: number;
    title?: string;
    city?: string;
    state?: string;
    neighborhood?: string;
  };
  onChange: (data: { latitude: number; longitude: number; radiusKm: number }) => void;
}

export default function MetaTargetMapPicker({
  initialLatitude,
  initialLongitude,
  initialRadiusKm = 30,
  propertyLocation,
  onChange,
}: MetaTargetMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const handlerRef = useRef<any>(null);
  const circleEntityRef = useRef<any>(null);
  const pinEntityRef = useRef<any>(null);
  const propertyPinRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  const [latitude, setLatitude] = useState<number>(initialLatitude || -3.7319);
  const [longitude, setLongitude] = useState<number>(initialLongitude || -38.5267);
  const [radiusKm, setRadiusKm] = useState<number>(Math.max(25, initialRadiusKm));
  const [isMapReady, setIsMapReady] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Propriedades do imóvel original para o botão "Centralizar no Imóvel"
  const propLat = propertyLocation?.latitude ?? initialLatitude;
  const propLng = propertyLocation?.longitude ?? initialLongitude;

  // Notificar pai sempre que latitude, longitude ou radiusKm mudarem
  const triggerChange = useCallback((newLat: number, newLng: number, newRadius: number) => {
    onChange({
      latitude: Number(newLat.toFixed(6)),
      longitude: Number(newLng.toFixed(6)),
      radiusKm: newRadius,
    });
  }, [onChange]);

  // Inicialização do Cesium Viewer
  useEffect(() => {
    let isMounted = true;

    async function initCesium() {
      if (isInitializedRef.current || !containerRef.current) return;
      isInitializedRef.current = true;

      try {
        window.CESIUM_BASE_URL = "/cesium/";

        const Cesium = await import("cesium");
        await import("cesium/Build/Cesium/Widgets/widgets.css");

        if (!isMounted || !containerRef.current) return;

        Cesium.Ion.defaultAccessToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjk3YjczMC0xYjg0LTQxNjEtODUyMy1lZDhjNzQ5MTVmZjYiLCJpZCI6NDAyMDMyLCJpYXQiOjE3NzMyNjE1MTd9.ukJFV7pVC7nSPVWifS4NwV5B4la7jvwCK_knj-Ik2Bk";

        const hiddenCredit = document.createElement("div");
        hiddenCredit.style.display = "none";

        const viewer = new Cesium.Viewer(containerRef.current, {
          creditContainer: hiddenCredit,
          terrain: Cesium.Terrain.fromWorldTerrain(),
          baseLayer: Cesium.ImageryLayer.fromWorldImagery({
            style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
          } as any),
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          infoBox: false,
          selectionIndicator: false,
        });

        viewerRef.current = viewer;
        viewer.scene.globe.depthTestAgainstTerrain = false;

        // 1. Círculo de Alcance da Meta (Púrpura / Neon)
        const circleEntity = viewer.entities.add({
          id: "meta-target-circle",
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
          ellipse: {
            semiMajorAxis: new Cesium.CallbackProperty(() => radiusKm * 1000, false),
            semiMinorAxis: new Cesium.CallbackProperty(() => radiusKm * 1000, false),
            material: Cesium.Color.fromCssColorString("rgba(168, 85, 247, 0.28)"),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#c084fc"),
            outlineWidth: 3,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          },
        });
        circleEntityRef.current = circleEntity;

        // 2. Marcador Central do Público
        const pinEntity = viewer.entities.add({
          id: "meta-target-center-pin",
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
          billboard: {
            image: "/pin.png",
            width: 38,
            height: 38,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        pinEntityRef.current = pinEntity;

        // 3. Pino do Imóvel Original (se diferente do centro escolhido)
        if (propLat && propLng && (Math.abs(propLat - latitude) > 0.001 || Math.abs(propLng - longitude) > 0.001)) {
          propertyPinRef.current = viewer.entities.add({
            id: "meta-property-origin-pin",
            position: Cesium.Cartesian3.fromDegrees(propLng, propLat),
            point: {
              pixelSize: 10,
              color: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
            },
          });
        }

        // Posicionar câmera com altitude proporcional ao raio
        const altitude = Math.max(16000, radiusKm * 2800);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
          duration: 1.2,
        });

        // Event Handler para clique no mapa (reposicionar centro do público)
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handlerRef.current = handler;

        handler.setInputAction((click: any) => {
          let cartesian: any = viewer.scene.pickPosition(click.position);
          if (!cartesian) {
            const ray = viewer.camera.getPickRay(click.position);
            if (ray) cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          }
          if (!cartesian) return;

          const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
          if (!cartographic) return;

          const newLng = Number(Cesium.Math.toDegrees(cartographic.longitude).toFixed(6));
          const newLat = Number(Cesium.Math.toDegrees(cartographic.latitude).toFixed(6));

          setLatitude(newLat);
          setLongitude(newLng);

          // Atualizar posições no Cesium
          if (circleEntityRef.current) {
            circleEntityRef.current.position = Cesium.Cartesian3.fromDegrees(newLng, newLat);
          }
          if (pinEntityRef.current) {
            pinEntityRef.current.position = Cesium.Cartesian3.fromDegrees(newLng, newLat);
          }

          triggerChange(newLat, newLng, radiusKm);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setIsMapReady(true);
      } catch (err) {
        console.error("Erro ao inicializar Cesium para MetaTargetMapPicker:", err);
      }
    }

    initCesium();

    return () => {
      isMounted = false;
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      circleEntityRef.current = null;
      pinEntityRef.current = null;
      propertyPinRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  // Atualizar Câmera e Entidades quando o raio mudar
  const handleRadiusChange = (newRadius: number, adjustCamera: boolean = true) => {
    const clamped = Math.max(25, Math.min(150, newRadius));
    setRadiusKm(clamped);
    triggerChange(latitude, longitude, clamped);

    if (viewerRef.current && adjustCamera) {
      import("cesium").then((Cesium) => {
        if (!viewerRef.current || viewerRef.current.isDestroyed()) return;
        const altitude = Math.max(16000, clamped * 2800);
        viewerRef.current.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
          duration: 0.6,
        });
      });
    }
  };

  // Centralizar de volta no imóvel original
  const handleResetToProperty = () => {
    if (!propLat || !propLng) return;
    setLatitude(propLat);
    setLongitude(propLng);

    import("cesium").then((Cesium) => {
      if (!viewerRef.current || viewerRef.current.isDestroyed()) return;

      if (circleEntityRef.current) {
        circleEntityRef.current.position = Cesium.Cartesian3.fromDegrees(propLng, propLat);
      }
      if (pinEntityRef.current) {
        pinEntityRef.current.position = Cesium.Cartesian3.fromDegrees(propLng, propLat);
      }

      const altitude = Math.max(16000, radiusKm * 2800);
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(propLng, propLat, altitude),
        duration: 1.0,
      });

      triggerChange(propLat, propLng, radiusKm);
    });
  };

  // Estimativa de audiência populacional aproximada com base no raio
  const estimatedReachMin = Math.round((Math.PI * Math.pow(radiusKm, 2) * 28));
  const estimatedReachMax = Math.round((Math.PI * Math.pow(radiusKm, 2) * 85));

  const formatAudience = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}k`;
    return num.toString();
  };

  const isCenteredOnProperty = Math.abs(latitude - propLat) < 0.0005 && Math.abs(longitude - propLng) < 0.0005;

  return (
    <div className="space-y-4 rounded-2xl border border-purple-500/20 bg-slate-900/60 p-5 backdrop-blur-xl">
      {/* Header do Seletor */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Target size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Raio de Alcance do Público (Meta Ads)
              <span className="rounded-full bg-purple-500/20 border border-purple-400/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
                Instagram & Facebook
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Aumente ou diminua o círculo para definir a área de entrega dos anúncios.
            </p>
          </div>
        </div>

        {!isCenteredOnProperty && (
          <button
            type="button"
            onClick={handleResetToProperty}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm group"
            title="Voltar o centro para as coordenadas do imóvel"
          >
            <RotateCcw size={13} className="group-hover:-rotate-45 transition-transform text-purple-400" />
            Centralizar no Imóvel
          </button>
        )}
      </div>

      {/* Container do Mapa Cesium com Círculo */}
      <div className="relative h-[340px] md:h-[380px] w-full overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-slate-950">
        <div ref={containerRef} className="h-full w-full" />

        {/* Loading Overlay */}
        {!isMapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-20">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <span className="mt-3 text-xs font-medium text-slate-300">
              Carregando visualização 3D do território...
            </span>
          </div>
        )}

        {/* Badge Flutuante no Topo do Mapa */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 px-3 py-1.5 text-xs text-white shadow-xl">
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-ping" />
            <span className="font-semibold text-purple-300">Raio Atual:</span>
            <strong className="text-white font-extrabold text-sm">{radiusKm} km</strong>
          </div>

          <div className="pointer-events-auto hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 px-3 py-1.5 text-[11px] text-slate-300 shadow-xl">
            <Compass size={13} className="text-purple-400" />
            <span>Clique no mapa para mover o centro</span>
          </div>
        </div>

        {/* Controles de Zoom Rápido no Canto Inferior Direito */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => handleRadiusChange(radiusKm + 5)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/90 hover:bg-purple-600 border border-white/15 text-white transition-all shadow-lg active:scale-95"
            title="Aumentar raio em 5 km"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleRadiusChange(radiusKm - 5)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/90 hover:bg-purple-600 border border-white/15 text-white transition-all shadow-lg active:scale-95 disabled:opacity-40"
            disabled={radiusKm <= 25}
            title="Diminuir raio em 5 km (mínimo 25 km)"
          >
            <Minus size={16} />
          </button>
        </div>

        {/* Indicador de Centro Inferior Esquerdo */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[10px] text-slate-400 shadow-lg">
            <MapPin size={11} className="text-emerald-400" />
            <span>{isCenteredOnProperty ? "Centro no Imóvel" : "Centro Personalizado"}</span>
          </div>
        </div>
      </div>

      {/* Controles Principais de Aumento / Diminuição do Raio */}
      <div className="space-y-3 pt-1">
        {/* Slider de Raio */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Ajuste Fino do Círculo:</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Raio:</span>
              <span className="rounded-lg bg-purple-500/20 border border-purple-500/30 px-2.5 py-0.5 text-xs font-black text-purple-300">
                {radiusKm} km
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-slate-500">25 km</span>
            <input
              type="range"
              min="25"
              max="150"
              step="5"
              value={radiusKm}
              onChange={(e) => handleRadiusChange(Number(e.target.value), false)}
              onMouseUp={() => handleRadiusChange(radiusKm, true)}
              onTouchEnd={() => handleRadiusChange(radiusKm, true)}
              className="flex-1 h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-purple-400 transition-all"
            />
            <span className="text-[11px] font-bold text-slate-500">150 km</span>
          </div>
        </div>

        {/* Botões de Presets Rápidos */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Tamanhos Prontos:</span>
          {[
            { label: "25 km (Recomendado)", value: 25 },
            { label: "40 km", value: 40 },
            { label: "60 km", value: 60 },
            { label: "80 km", value: 80 },
            { label: "120 km", value: 120 },
          ].map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleRadiusChange(preset.value, true)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
                radiusKm === preset.value
                  ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30 scale-105"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Informativos de Alcance e Políticas da Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
        {/* Estimativa de Pessoas */}
        <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
            <Users size={16} />
          </div>
          <div>
            <span className="block text-[11px] font-medium text-slate-400">Alcance Potencial Estimado</span>
            <span className="text-xs font-bold text-white">
              ~{formatAudience(estimatedReachMin)} a {formatAudience(estimatedReachMax)} pessoas no raio
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Usuários ativos no Instagram e Facebook
            </span>
          </div>
        </div>

        {/* Conformidade Categoria Especial HOUSING */}
        <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/5 p-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
            <ShieldCheck size={16} />
          </div>
          <div>
            <span className="block text-[11px] font-medium text-slate-400">Meta Categoria Especial (Housing)</span>
            <span className="text-xs font-bold text-emerald-300">
              Raio em Conformidade Oficial
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5">
              Mínimo exigido de 25 km (15 milhas) respeitado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
