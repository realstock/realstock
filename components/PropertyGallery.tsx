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
  
  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (swipeDistance > minSwipeDistance) {
      goNext();
    } else if (swipeDistance < -minSwipeDistance) {
      goPrev();
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
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
      <div 
        className="relative group overflow-hidden rounded-[20px] md:rounded-[28px] border border-white/10 bg-black h-[320px] sm:h-[400px] md:h-[500px] w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main Image */}
        <div className="w-full h-full flex items-center justify-center p-2 md:p-0 select-none">
          <img
            src={images[currentIndex].imageUrl}
            alt={`${alt} - Foto ${currentIndex + 1}`}
            className="h-full w-full object-contain transition-opacity duration-300"
            draggable={false}
          />
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 md:p-3 rounded-full backdrop-blur-md transition-all duration-300 border border-white/20 hover:scale-110 active:scale-95"
              aria-label="Anterior"
            >
              <ChevronLeft size={24} className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 md:p-3 rounded-full backdrop-blur-md transition-all duration-300 border border-white/20 hover:scale-110 active:scale-95"
              aria-label="Próxima"
            >
              <ChevronRight size={24} className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Counter Overlay */}
        {images.length > 1 && (
          <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-white/20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div
          ref={thumbnailsRef}
          className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-none snap-x pl-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {images.map((img, idx) => (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-20 h-16 md:w-28 md:h-20 rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer snap-center ${
                currentIndex === idx
                  ? "ring-2 ring-white scale-100 shadow-lg shadow-black/50"
                  : "border border-white/10 opacity-50 active:opacity-80 scale-95"
              }`}
              aria-label={`Ver foto ${idx + 1}`}
            >
              <img
                src={img.imageUrl}
                alt={`Miniatura ${idx + 1}`}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
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
