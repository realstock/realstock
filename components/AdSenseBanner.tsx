"use client";

import { useEffect, useRef } from "react";

export default function AdSenseBanner({
  client = "ca-pub-8662280633716608",
  slot = "", // Optional: specific slot if you create blocks in Adsense panel
  format = "auto",
  responsive = "true",
  style = { display: "block" },
  className = "adsbygoogle",
}) {
  const isLoaded = useRef(false);

  useEffect(() => {
    // Only push if running in the browser and the script is injected
    try {
      if (typeof window !== "undefined" && !isLoaded.current) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch (err: any) {
      console.warn("GAds Push Error:", err);
    }
  }, []);

  return (
    <ins
      className={className}
      style={style}
      data-ad-client={client}
      data-ad-slot={slot || undefined}
      data-ad-format={format}
      data-full-width-responsive={responsive}
    />
  );
}
