"use client";

import { useEffect, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";

type Place = {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  distanceFormatted: string;
  mapUrl: string;
};

type InsightCategory = {
  type: string;
  label: string;
  count: number;
  places: Place[];
};

type Props = {
  latitude: number | string | null;
  longitude: number | string | null;
};

const ICONS: Record<string, string> = {
  supermarket: "🛒",
  bakery: "🥐",
  pharmacy: "🏥",
  school: "🏫",
  gym: "🏋️",
  park: "🌳",
};

export default function PropertyLocationInsights({ latitude, longitude }: Props) {
  const [insights, setInsights] = useState<InsightCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchInsights() {
      if (!latitude || !longitude) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/places/nearby?lat=${latitude}&lng=${longitude}`);
        if (!response.ok) throw new Error("Failed to fetch");
        
        const json = await response.json();
        if (json.success && json.data) {
          const validData = json.data.filter((item: InsightCategory) => item.count > 0);
          setInsights(validData);
        } else {
          throw new Error("Invalid response");
        }
      } catch (err) {
        console.error("ERRO NO FETCH:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [latitude, longitude]);

  if (!latitude || !longitude) return null;

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 animate-pulse mt-8">
        <div className="h-6 w-48 bg-white/10 rounded mb-4"></div>
        <div className="space-y-4">
          <div className="h-24 w-full bg-white/5 rounded-2xl"></div>
          <div className="h-24 w-full bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-red-500/20 bg-red-500/5 p-5 mt-8 text-center text-red-400">
        <p className="text-sm">Houve um erro ao buscar os insights de localização.</p>
        <p className="text-xs mt-1">Verifique se o servidor de desenvolvimento recarregou a nova API.</p>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 mt-8 text-center text-slate-400">
        <p className="text-sm">Nenhum estabelecimento encontrado no raio de 2km.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-6 mt-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
          <MapPin size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold">O que há por perto?</h2>
          <p className="text-xs text-slate-400">
            Principais estabelecimentos num raio de 2km em linha reta.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {insights.map((category) => (
          <div key={category.type} className="border-t border-white/5 pt-5 first:border-0 first:pt-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{ICONS[category.type] || "📍"}</span>
                <h3 className="text-base font-bold text-white">{category.label}</h3>
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-white/10 rounded-full text-slate-300">
                {category.count} encontrados
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {category.places.map((place) => (
                <a
                  key={place.id}
                  href={place.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-slate-900/40 p-4 hover:bg-white/5 transition-colors relative overflow-hidden"
                >
                  <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={14} className="text-blue-400" />
                  </div>
                  
                  <div>
                    <div className="text-sm font-bold text-white pr-6 line-clamp-1">
                      {place.name}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 line-clamp-1">
                      {place.address}
                    </div>
                  </div>
                  
                  <div className="mt-3 inline-flex items-center gap-1.5 self-start rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-400">
                    <MapPin size={10} />
                    {place.distanceFormatted} de distância
                  </div>
                </a>
              ))}
            </div>
            
            {category.count > category.places.length && (
              <div className="mt-3 text-center text-xs text-slate-500">
                + {category.count - category.places.length} locais ocultos na região
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
