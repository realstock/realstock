"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (coords: { latitude: number; longitude: number }) => void;
  flyToCoords?: { latitude: number; longitude: number; zoomLevel?: number } | null;
};

export default function PropertyLocationPicker({
  latitude,
  longitude,
  onChange,
  flyToCoords,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const handlerRef = useRef<any>(null);
  const selectedPinRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    async function start() {
      if (initializedRef.current || !containerRef.current) return;
      initializedRef.current = true;

      window.CESIUM_BASE_URL = "/cesium/";

      const Cesium = await import("cesium");
      await import("cesium/Build/Cesium/Widgets/widgets.css");

      Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjk3YjczMC0xYjg0LTQxNjEtODUyMy1lZDhjNzQ5MTVmZjYiLCJpZCI6NDAyMDMyLCJpYXQiOjE3NzMyNjE1MTd9.ukJFV7pVC7nSPVWifS4NwV5B4la7jvwCK_knj-Ik2Bk";

      const viewer = new Cesium.Viewer(containerRef.current, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        timeline: false,
        baseLayerPicker: true,
        geocoder: true,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
      });

      viewerRef.current = viewer;
      viewer.scene.globe.depthTestAgainstTerrain = true;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-39.0, -4.0, 1200000),
        duration: 1.5,
      });

      setIsMapReady(true);

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handlerRef.current = handler;

      handler.setInputAction((click: any) => {
        let cartesian: any = viewer.scene.pickPosition(click.position);

          if (!cartesian) {
            const ray = viewer.camera.getPickRay(click.position);
            if (ray) {
              const pickedCartesian = viewer.scene.globe.pick(ray, viewer.scene);
              if (pickedCartesian) {
                cartesian = pickedCartesian;
              }
            }
          }

          if (!cartesian) return;

        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        if (!cartographic) return;

        const longitude = Number(
          Cesium.Math.toDegrees(cartographic.longitude).toFixed(6)
        );
        const latitude = Number(
          Cesium.Math.toDegrees(cartographic.latitude).toFixed(6)
        );

        console.log("COORDENADAS CAPTURADAS:", { latitude, longitude });

        onChangeRef.current({ latitude, longitude });

        if (selectedPinRef.current) {
          viewer.entities.remove(selectedPinRef.current);
          selectedPinRef.current = null;
        }

        selectedPinRef.current = viewer.entities.add({
          id: "selected-property-pin",
          position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
          billboard: {
            image: "/pin.png",
            width: 40,
            height: 40,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    start();

    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }

      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }

      selectedPinRef.current = null;
      initializedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function updatePinFromProps() {
      const viewer = viewerRef.current;
      if (!viewer || latitude === null || longitude === null) return;

      const Cesium = await import("cesium");

      if (selectedPinRef.current) {
        viewer.entities.remove(selectedPinRef.current);
        selectedPinRef.current = null;
      }

      selectedPinRef.current = viewer.entities.add({
        id: "selected-property-pin",
        position: Cesium.Cartesian3.fromDegrees(longitude, latitude),
        billboard: {
          image: "/pin.png",
          width: 40,
          height: 40,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
    }

    updatePinFromProps();
  }, [latitude, longitude]);

  useEffect(() => {
    async function handleFlyTo() {
      const viewer = viewerRef.current;
      if (!viewer || !flyToCoords || !isMapReady) return;

      const Cesium = await import("cesium");

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          flyToCoords.longitude,
          flyToCoords.latitude,
          flyToCoords.zoomLevel || 2000
        ),
        duration: 1.5,
      });
    }

    handleFlyTo();
  }, [flyToCoords, isMapReady]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-slate-300">
          Clique no mapa para marcar o local exato do imóvel.
        </div>
        <div className="mt-2 text-xs text-slate-400">
          Latitude: {latitude ?? "-"} | Longitude: {longitude ?? "-"}
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-[420px] w-full overflow-hidden rounded-[24px] border border-white/10"
      />
    </div>
  );
}