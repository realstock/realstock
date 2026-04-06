"use client";

import { useEffect } from "react";

export default function SecurityBlocker() {
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    const preventCopyCut = (e: Event) => e.preventDefault();

    const handleKey = (e: KeyboardEvent) => {
      // BLOQUEIA DEVTOOLS
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") ||
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") ||
        (e.ctrlKey && e.key.toLowerCase() === "u")
      ) {
        e.preventDefault();
      }

      // BLOQUEIA CTRL+C e CTRL+X
      if (
        (e.ctrlKey && e.key.toLowerCase() === "c") ||
        (e.ctrlKey && e.key.toLowerCase() === "x")
      ) {
        e.preventDefault();
      }

      // 👉 NÃO bloqueia CTRL+V
    };

    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventCopyCut);
    document.addEventListener("cut", preventCopyCut);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventCopyCut);
      document.removeEventListener("cut", preventCopyCut);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return null;
}