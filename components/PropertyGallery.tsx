"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PropertyImage {
  id: number;
  imageUrl: string;
}

interface PropertyGalleryProps {
  images: PropertyImage[];
  alt: string;
}

export default function PropertyGallery({ images, alt }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return (
      <div className="flex h-[440px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 text-slate-500">
        Nenhuma foto enviada para este imóvel.
      </div>
    );
  }

  const goNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // Auto-scroll thumbnails
  useEffect(() => {
    if (!thumbnailsRef.current) return;
    const thumbnailObj = thumbnailsRef.current.children[currentIndex] as HTMLElement;
    if (thumbnailObj) {
      thumbnailObj.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentIndex]);

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Container */}
      <div className="relative group overflow-hidden rounded-[28px] border border-white/10 bg-black h-[440px]">
        {/* Main Image */}
        <div className="w-full h-full flex items-center justify-center">
          <img
            // Add a key to force re-render/animation if needed, but smooth src swap is fine too
            key={images[currentIndex].id || currentIndex}
            src={images[currentIndex].imageUrl}
            alt={`${alt} - Foto ${currentIndex + 1}`}
            className="h-full w-full object-cover animate-in fade-in duration-300"
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/20 hover:scale-110"
              aria-label="Anterior"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/20 hover:scale-110"
              aria-label="Próxima"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Counter Overlay */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 backdrop-blur-md text-white text-xs font-semibold px-4 py-1.5 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          ref={thumbnailsRef}
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x pl-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-28 h-20 rounded-2xl overflow-hidden transition-all duration-300 snap-center ${
                currentIndex === idx
                  ? "ring-2 ring-white scale-100 shadow-lg shadow-black/50"
                  : "border border-white/10 opacity-50 hover:opacity-100 scale-95 hover:scale-100"
              }`}
              aria-label={`Ver foto ${idx + 1}`}
            >
              <img
                src={img.imageUrl}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {/* Optional darkening overlay for non-active thumbnails */}
              {currentIndex !== idx && (
                <div className="absolute inset-0 bg-black/30 transition-colors duration-300" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
