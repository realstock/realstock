"use client";

import { useState, useEffect, useRef } from "react";

type Suggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  value: string;
  onChange: (val: string) => void;
  onSelectCoordinates?: (coords: { latitude: number; longitude: number }) => void;
  city: string;
  stateName: string;
};

export default function NeighborhoodAutocomplete({
  value,
  onChange,
  onSelectCoordinates,
  city,
  stateName,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value || value.length < 3 || !isFocused || !city || !stateName) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const q = `${value}, ${city}, ${stateName}`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            q
          )}&format=json&limit=5&addressdetails=1`
        );
        const data = await res.json();
        setSuggestions(data || []);
      } catch (err) {
        console.error("Erro ao buscar bairro:", err);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, city, stateName, isFocused]);

  function handleSelect(suggestion: Suggestion) {
    const parts = suggestion.display_name.split(",");
    const bairro = parts[0] ? parts[0].trim() : value;
    
    onChange(bairro);
    setIsFocused(false);
    setSuggestions([]);

    if (onSelectCoordinates) {
      onSelectCoordinates({
        latitude: parseFloat(suggestion.lat),
        longitude: parseFloat(suggestion.lon),
      });
    }
  }

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => setIsFocused(false), 200);
        }}
        disabled={!city}
        placeholder={city ? "Comece a digitar (Ex: Centro)" : "Selecione a cidade primeiro"}
        className="input w-full"
      />
      {isFocused && (value.length >= 3) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-800 shadow-2xl">
          {loading ? (
            <div className="p-3 text-sm text-slate-400">Buscando local...</div>
          ) : suggestions.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSelect(s)}
                  className="cursor-pointer border-b border-white/5 p-3 text-sm text-slate-200 transition last:border-0 hover:bg-white/10"
                >
                  <div className="font-semibold text-white">
                    {s.display_name.split(",")[0]}
                  </div>
                  <div className="truncate text-xs text-slate-400">
                    {s.display_name}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-slate-400">
              Nenhuma localidade encontrada. Pressione enter se estiver correto.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
