"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

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
    return <LoadingScreen title="Acesso Administrativo" subtitle="Validando credenciais de segurança..." />;
  }

  if (!authorized) return null;

  return <>{children}</>;
}