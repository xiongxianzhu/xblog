"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMe } from "@/lib/api";

type AuthState = "loading" | "authed" | "guest";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin";
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      setState("loading");
      try {
        await getMe();
        if (cancelled) return;
        if (isLoginPage) {
          router.replace("/admin/dashboard");
          return;
        }
        setState("authed");
      } catch {
        if (cancelled) return;
        if (isLoginPage) {
          setState("guest");
        } else {
          router.replace("/admin");
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [pathname, isLoginPage, router]);

  if (state === "loading") {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isLoginPage && state === "guest") {
    return <>{children}</>;
  }

  if (!isLoginPage && state === "authed") {
    return <>{children}</>;
  }

  return null;
}
