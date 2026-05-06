"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";

export default function MinhaContaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      const currentPath = window.location.pathname + window.location.search;
      router.replace(`/login?callbackUrl=${encodeURIComponent(currentPath)}`);
    }
  }, [status, router]);

  if (status === "loading") {
    return <LoadingScreen title="Minha Conta" subtitle="Validando sua sessão de acesso..." />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  return <>{children}</>;
}
