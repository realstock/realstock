"use client";

import { useState } from "react";
import { Navigation } from "lucide-react";

type Props = {
  latitude: number | string | null;
  longitude: number | string | null;
};

export default function PropertyStreetView({ latitude, longitude }: Props) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!latitude || !longitude || hasError) {
    return null; // Esconde se não tiver coordenada ou se a foto não existir (erro 404)
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 mt-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
          <Navigation size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Visão da Rua</h2>
          <p className="text-xs text-slate-400">
            Explore a fachada do imóvel e a vizinhança.
          </p>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 h-[280px] bg-slate-900/50">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-white/5">
            <div className="h-full w-full"></div>
          </div>
        )}
        
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/streetview?lat=${latitude}&lng=${longitude}`}
          alt="Visão da rua do imóvel no Google Street View"
          className={`h-full w-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)} // Se o backend retornar 404, cai aqui e esconde tudo
        />
      </div>
      
      <div className="mt-4">
        <a
          href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
        >
          Explorar em 360º no Google Maps
        </a>
      </div>
    </div>
  );
}
