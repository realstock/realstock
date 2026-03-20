"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("realstock_user");

    if (!raw) {
      router.replace("/");
      return;
    }

    try {
      const user = JSON.parse(raw);

      if (user?.role !== "admin") {
        router.replace("/");
        return;
      }

      setAuthorized(true);
    } catch {
      router.replace("/");
      return;
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Carregando área administrativa...
      </main>
    );
  }

  if (!authorized) return null;

  return <>{children}</>;
}