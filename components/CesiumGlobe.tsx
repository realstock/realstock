"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

export default function CesiumGlobe() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let viewer: any;

    async function start() {
      window.CESIUM_BASE_URL = "/cesium/";

      const Cesium = await import("cesium");
      await import("cesium/Build/Cesium/Widgets/widgets.css");

      Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjk3YjczMC0xYjg0LTQxNjEtODUyMy1lZDhjNzQ5MTVmZjYiLCJpZCI6NDAyMDMyLCJpYXQiOjE3NzMyNjE1MTd9.ukJFV7pVC7nSPVWifS4NwV5B4la7jvwCK_knj-Ik2Bk";

      if (!containerRef.current) return;

      viewer = new Cesium.Viewer(containerRef.current, {
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

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-39.268, -3.277, 1800000),
      });

      const pin1 = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(-39.268, -3.277),
        point: {
          pixelSize: 12,
        },
        label: {
          text: "Terreno Guajiru",
          pixelOffset: new Cesium.Cartesian2(0, -24),
        },
      });

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const picked = viewer.scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id === pin1) {
          alert("Abrir página do anúncio futuramente");
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    start();

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, []);

  return <div ref={containerRef} className="h-[75vh] w-full rounded-3xl overflow-hidden" />;