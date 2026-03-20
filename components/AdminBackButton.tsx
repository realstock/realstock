"use client";

import { useRouter } from "next/navigation";

export default function AdminBackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
    >
      ← Voltar
    </button>
  );
}