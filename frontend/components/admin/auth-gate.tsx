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
  const isResetPasswordPage = pathname === "/admin/reset-password";
  const isPublicAdminPage = isLoginPage || isResetPasswordPage;
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
        if (isResetPasswordPage) {
          setState("guest");
          return;
        }
        setState("authed");
      } catch {
        if (cancelled) return;
        if (isPublicAdminPage) {
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
  }, [pathname, isLoginPage, isPublicAdminPage, router]);

  if (state === "loading") {
    return (
      <div className="admin-login-screen w-full max-w-[26rem]">
        <div className="mb-8 flex items-center gap-2.5">
          <Skeleton className="size-9 rounded-[2px]" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="admin-login-panel overflow-hidden">
          <div className="border-b border-border/70 px-6 py-5">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="mt-2 h-4 w-44" />
          </div>
          <div className="flex flex-col gap-4 px-6 py-6">
            <Skeleton className="h-11 w-full rounded-[2px]" />
            <Skeleton className="h-11 w-full rounded-[2px]" />
            <Skeleton className="mt-1 h-11 w-full rounded-[2px]" />
          </div>
        </div>
      </div>
    );
  }

  if (isPublicAdminPage && state === "guest") {
    return <>{children}</>;
  }

  if (!isPublicAdminPage && state === "authed") {
    return <>{children}</>;
  }

  return null;
}
