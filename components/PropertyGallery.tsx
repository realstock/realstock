"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";

interface PropertyImage {
  id: number;
  imageUrl: string;
}

interface PropertyVideo {
  id: number;
  videoUrl: string;
}

interface PropertyGalleryProps {
  images: PropertyImage[];
  videos?: PropertyVideo[];
  alt: string;
}

export default function PropertyGallery({ images, videos = [], alt }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  
  // Combina imagens e vídeos em um único array de mídia
  const mediaItems = [
    ...images.map(img => ({ type: 'image' as const, url: img.imageUrl, id: img.id })),
    ...videos.map(vid => ({ type: 'video' as const, url: vid.videoUrl, id: vid.id }))
  ];

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  if (!mediaItems || mediaItems.length === 0) {
    return (
      <div className="flex h-[440px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/5 text-slate-500">
        Nenhuma mídia enviada para este imóvel.
      </div>
    );
  }

  const goNext = () => {
    setCurrentIndex((prev) => (prev === mediaItems.length - 1 ? 0 : prev + 1));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? mediaItems.length - 1 : prev - 1));
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

  const currentItem = mediaItems[currentIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Media Container */}
      <div 
        className="relative group overflow-hidden rounded-[20px] md:rounded-[28px] border border-white/10 bg-black h-[320px] sm:h-[400px] md:h-[500px] w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main Content */}
        <div className="w-full h-full flex items-center justify-center select-none">
          {currentItem.type === 'image' ? (
            <img
              src={currentItem.url}
              alt={`${alt} - Foto ${currentIndex + 1}`}
              className="h-full w-full object-contain transition-opacity duration-300"
              draggable={false}
            />
          ) : (
            <video
              key={currentItem.url}
              src={currentItem.url}
              autoPlay
              muted
              loop
              controls
              className="h-full w-full object-contain"
              playsInline
            />
          )}
        </div>

        {/* Navigation Arrows */}
        {mediaItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 md:p-3 rounded-full backdrop-blur-md transition-all duration-300 border border-white/20 z-10 hover:scale-110 active:scale-95"
              aria-label="Anterior"
            >
              <ChevronLeft size={24} className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white p-2 md:p-3 rounded-full backdrop-blur-md transition-all duration-300 border border-white/20 z-10 hover:scale-110 active:scale-95"
              aria-label="Próxima"
            >
              <ChevronRight size={24} className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Counter Overlay */}
        {mediaItems.length > 1 && (
          <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-white/20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10">
            {currentIndex + 1} / {mediaItems.length} {currentItem.type === 'video' && '• VÍDEO'}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {mediaItems.length > 1 && (
        <div
          ref={thumbnailsRef}
          className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-none snap-x pl-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {mediaItems.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-20 h-16 md:w-28 md:h-20 rounded-xl md:rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer snap-center ${
                currentIndex === idx
                  ? "ring-2 ring-white scale-100 shadow-lg shadow-black/50"
                  : "border border-white/10 opacity-50 active:opacity-80 scale-95"
              }`}
              aria-label={`Ver ${item.type === 'image' ? 'foto' : 'vídeo'} ${idx + 1}`}
            >
              {item.type === 'image' ? (
                <img
                  src={item.url}
                  alt={`Miniatura ${idx + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
                   <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover opacity-50" />
                   <div className="absolute inset-0 flex items-center justify-center text-white/80">
                      <Film size={20} />
                   </div>
                </div>
              )}
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
