"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

declare global {
  interface Window {
    CESIUM_BASE_URL: string;
  }
}

type PropertyPin = {
  id: number;
  title: string;
  price: string;
  legalStatus: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  mainImage: string | null;
  sponsoredUntil?: string | null;
};

type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type ClusterZoomTarget = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export default function CesiumMapClient({
  properties,
  onBoundsChange,
  clusterZoomTarget,
  onClusterZoomRequest,
}: {
  properties: PropertyPin[];
  onBoundsChange?: (bounds: MapBounds) => void;
  clusterZoomTarget?: ClusterZoomTarget | null;
  onClusterZoomRequest?: (target: ClusterZoomTarget) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<any>(null);
  const handlerRef = useRef<any>(null);
  const dataSourceRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const clusterListenerAddedRef = useRef(false);
  const propertiesRef = useRef<PropertyPin[]>(properties);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onClusterZoomRequestRef = useRef(onClusterZoomRequest);
  const boundsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasZoomedToPinsRef = useRef(false);
  const lastClusterZoomTargetRef = useRef<string>("");

  const [selectedProperty, setSelectedProperty] = useState<PropertyPin | null>(
    null
  );
  const [showMapCard, setShowMapCard] = useState(false);

  useEffect(() => {
    propertiesRef.current = properties;
  }, [properties]);

  useEffect(() => {
    onBoundsChangeRef.current = onBoundsChange;
  }, [onBoundsChange]);

  useEffect(() => {
    onClusterZoomRequestRef.current = onClusterZoomRequest;
  }, [onClusterZoomRequest]);

  function emitBounds(viewer: any, Cesium: any) {
    if (!onBoundsChangeRef.current) return;

    try {
      const rectangle = viewer.camera.computeViewRectangle(
        viewer.scene.globe.ellipsoid
      );

      if (!rectangle) return;

      const north = Number(Cesium.Math.toDegrees(rectangle.north).toFixed(6));
      const south = Number(Cesium.Math.toDegrees(rectangle.south).toFixed(6));
      const east = Number(Cesium.Math.toDegrees(rectangle.east).toFixed(6));
      const west = Number(Cesium.Math.toDegrees(rectangle.west).toFixed(6));

      onBoundsChangeRef.current({ north, south, east, west });
    } catch (error) {
      console.error("Erro ao calcular bounds do mapa:", error);
    }
  }

  useEffect(() => {
    async function start() {
      if (initializedRef.current || !containerRef.current) return;
      initializedRef.current = true;

      window.CESIUM_BASE_URL = "/cesium/";

      const Cesium = await import("cesium");
      await import("cesium/Build/Cesium/Widgets/widgets.css");

      Cesium.Ion.defaultAccessToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYjk3YjczMC0xYjg0LTQxNjEtODUyMy1lZDhjNzQ5MTVmZjYiLCJpZCI6NDAyMDMyLCJpYXQiOjE3NzMyNjE1MTd9.ukJFV7pVC7nSPVWifS4NwV5B4la7jvwCK_knj-Ik2Bk";

      const hiddenCredit = document.createElement("div");
      hiddenCredit.style.display = "none";

      const viewer = new Cesium.Viewer(containerRef.current, {
        creditContainer: hiddenCredit,
        terrain: Cesium.Terrain.fromWorldTerrain(),
        baseLayer: Cesium.ImageryLayer.fromWorldImagery({
          style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS,
        }),
        animation: false,
        timeline: false,
        baseLayerPicker: true,
        geocoder: true,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        requestRenderMode: true,
      });

      viewerRef.current = viewer;
      viewer.scene.globe.depthTestAgainstTerrain = true;

      const dataSource = new Cesium.CustomDataSource("properties");
      dataSourceRef.current = dataSource;
      viewer.dataSources.add(dataSource);

      dataSource.clustering.enabled = true;
      dataSource.clustering.pixelRange = 45;
      dataSource.clustering.minimumClusterSize = 2;

      if (!clusterListenerAddedRef.current) {
        dataSource.clustering.clusterEvent.addEventListener(
          (clusteredEntities: any[], cluster: any) => {
            const clusterId = {
              isCluster: true,
              clusteredEntities,
            };

            if (cluster.billboard) {
              cluster.billboard.show = false;
              cluster.billboard.id = clusterId;
            }

            if (cluster.point) {
              cluster.point.show = true;
              cluster.point.pixelSize = 40;
              cluster.point.color = Cesium.Color.fromCssColorString("#2563eb");
              cluster.point.outlineColor = Cesium.Color.WHITE;
              cluster.point.outlineWidth = 2;
              cluster.point.disableDepthTestDistance =
                Number.POSITIVE_INFINITY;
              cluster.point.id = clusterId;
            }

            if (cluster.label) {
              cluster.label.show = true;
              cluster.label.text = clusteredEntities.length.toString();
              cluster.label.fillColor = Cesium.Color.WHITE;
              cluster.label.outlineColor = Cesium.Color.BLACK;
              cluster.label.outlineWidth = 2;
              cluster.label.style = Cesium.LabelStyle.FILL_AND_OUTLINE;
              cluster.label.scale = 1.0;
              cluster.label.font = "bold 18px sans-serif";
              cluster.label.pixelOffset = new Cesium.Cartesian2(0, 0);
              cluster.label.verticalOrigin = Cesium.VerticalOrigin.CENTER;
              cluster.label.horizontalOrigin = Cesium.HorizontalOrigin.CENTER;
              cluster.label.disableDepthTestDistance =
                Number.POSITIVE_INFINITY;
              cluster.label.id = clusterId;
            }
          }
        );

        clusterListenerAddedRef.current = true;
      }

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(-39.0, -4.0, 900000),
        duration: 1.2,
        complete: () => {
          viewer.scene.requestRender();
          emitBounds(viewer, Cesium);
        },
      });

      viewer.camera.moveEnd.addEventListener(() => {
        if (boundsTimeoutRef.current) {
          clearTimeout(boundsTimeoutRef.current);
        }

        boundsTimeoutRef.current = setTimeout(() => {
          viewer.scene.requestRender();
          emitBounds(viewer, Cesium);
        }, 300) as any;
      });

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handlerRef.current = handler;

      handler.setInputAction((click: any) => {
        const picked = viewer.scene.pick(click.position);

        if (!Cesium.defined(picked)) {
          setShowMapCard(false);
          setSelectedProperty(null);
          return;
        }

        const pickedId = picked.id;

        if (pickedId?.isCluster && pickedId?.clusteredEntities?.length) {
          const entities = pickedId.clusteredEntities;

          const pins = entities
            .map((entity: any) => {
              const entityId = Number(String(entity.id));
              return propertiesRef.current.find((item) => item.id === entityId);
            })
            .filter(Boolean) as PropertyPin[];

          if (pins.length > 0) {
            const north = Math.max(...pins.map((item) => item.lat));
            const south = Math.min(...pins.map((item) => item.lat));
            const east = Math.max(...pins.map((item) => item.lng));
            const west = Math.min(...pins.map((item) => item.lng));

            onClusterZoomRequestRef.current?.({
              north,
              south,
              east,
              west,
            });
          }

          const positions = entities
            .map((entity: any) =>
              entity.position?.getValue(viewer.clock.currentTime)
            )
            .filter(Boolean);

          if (positions.length > 0) {
            const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);

            viewer.camera.flyToBoundingSphere(boundingSphere, {
              duration: 1.2,
              complete: () => {
                viewer.scene.requestRender();
                emitBounds(viewer, Cesium);
              },
            });
          }

          return;
        }

        if (pickedId?.id) {
          const actualId = String(pickedId.id).replace('thumb-', '');
          const selected = propertiesRef.current.find(
            (item) => item.id.toString() === actualId
          );

          if (selected) {
            setSelectedProperty(selected);
            setShowMapCard(true);
            return;
          }
        }

        // Se clicar em qualquer outra coisa válida mas irrelevante
        setShowMapCard(false);
        setSelectedProperty(null);
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    }

    start();

    return () => {
      if (boundsTimeoutRef.current) {
        clearTimeout(boundsTimeoutRef.current);
        boundsTimeoutRef.current = null;
      }

      if (handlerRef.current) {
        handlerRef.current.destroy();
        handlerRef.current = null;
      }

      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }

      dataSourceRef.current = null;
      initializedRef.current = false;
      clusterListenerAddedRef.current = false;
      hasZoomedToPinsRef.current = false;
      lastClusterZoomTargetRef.current = "";
    };
  }, []);

  useEffect(() => {
    async function syncProperties() {
      const viewer = viewerRef.current;
      const dataSource = dataSourceRef.current;

      if (!viewer || !dataSource) return;

      const Cesium = await import("cesium");

      dataSource.entities.removeAll();

      // Remove existing thumbnails from the global entity pool to avoid leaks
      viewer.entities.values
        .filter((e: any) => String(e.id).startsWith("thumb-"))
        .forEach((e: any) => viewer.entities.remove(e));

      properties.forEach((property) => {
        dataSource.entities.add({
          id: property.id.toString(),
          name: property.title,
          position: Cesium.Cartesian3.fromDegrees(property.lng, property.lat),
          billboard: {
            image: "/pin.png",
            width: 36,
            height: 36,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });

        if (property.mainImage) {
          viewer.entities.add({
            id: `thumb-${property.id}`,
            position: Cesium.Cartesian3.fromDegrees(property.lng, property.lat),
            billboard: {
              image: property.mainImage,
              width: 100,
              height: 70,
              pixelOffset: new Cesium.Cartesian2(0, -42),
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 4000),
            }
          });
        }
      });

      dataSource.clustering.enabled = false;
      dataSource.clustering.enabled = true;

      viewer.scene.requestRender();

      if (properties.length > 0 && !hasZoomedToPinsRef.current) {
        hasZoomedToPinsRef.current = true;

        try {
          await viewer.zoomTo(dataSource);
          viewer.scene.requestRender();
        } catch (error) {
          console.error("Erro ao aplicar zoom inicial nos pins:", error);
        }
      }

      if (properties.length === 0) {
        hasZoomedToPinsRef.current = false;
      }

      if (
        selectedProperty &&
        !properties.some((item) => item.id === selectedProperty.id)
      ) {
        setSelectedProperty(null);
        setShowMapCard(false);
      }
    }

    syncProperties();
  }, [properties, selectedProperty]);

  useEffect(() => {
    async function applyClusterZoomTarget() {
      if (!clusterZoomTarget) return;

      const viewer = viewerRef.current;
      if (!viewer) return;

      const key = JSON.stringify(clusterZoomTarget);
      if (lastClusterZoomTargetRef.current === key) return;

      lastClusterZoomTargetRef.current = key;

      const Cesium = await import("cesium");

      const paddingLat = Math.max(
        (clusterZoomTarget.north - clusterZoomTarget.south) * 0.25,
        0.01
      );
      const paddingLng = Math.max(
        (clusterZoomTarget.east - clusterZoomTarget.west) * 0.25,
        0.01
      );

      const rectangle = Cesium.Rectangle.fromDegrees(
        clusterZoomTarget.west - paddingLng,
        clusterZoomTarget.south - paddingLat,
        clusterZoomTarget.east + paddingLng,
        clusterZoomTarget.north + paddingLat
      );

      viewer.camera.flyTo({
        destination: rectangle,
        duration: 1.2,
        complete: () => {
          viewer.scene.requestRender();
          emitBounds(viewer, Cesium);
        },
      });
    }

    applyClusterZoomTarget();
  }, [clusterZoomTarget]);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 shadow-2xl">
      <div
        ref={containerRef}
        className="h-[78vh] w-full overflow-hidden rounded-[28px]"
      />

      {selectedProperty && showMapCard && (
        <div className="absolute left-5 top-5 z-10 w-[340px] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl backdrop-blur">
          {selectedProperty.mainImage ? (
            <img
              src={selectedProperty.mainImage}
              alt={selectedProperty.title}
              className="h-44 w-full object-cover"
            />
          ) : (
            <div className="flex h-44 items-center justify-center bg-slate-800 text-sm text-slate-500">
              Sem foto
            </div>
          )}

          <div className="p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold leading-tight">
                  {selectedProperty.title}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  {selectedProperty.city}
                </div>
              </div>

              <button
                onClick={() => setShowMapCard(false)}
                className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300 hover:text-white"
              >
                fechar
              </button>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Preço</span>
                <span className="font-semibold text-emerald-400">
                  {selectedProperty.price}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Jurídico</span>
                <span className="font-semibold">
                  {selectedProperty.legalStatus}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-400">Área</span>
                <span className="font-semibold">{selectedProperty.area}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href={`/imovel/${selectedProperty.id}`}
                className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold text-slate-900"
              >
                Ver anúncio
              </Link>

              <Link
                href={`/imovel/${selectedProperty.id}`}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-white"
              >
                Fazer oferta
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}