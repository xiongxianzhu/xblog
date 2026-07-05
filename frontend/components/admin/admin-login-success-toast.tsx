"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect } from "react";
import { toast } from "sonner";

type FeedbackTranslator = (key: "loginSuccess" | "loginSuccessDesc", values?: { username: string }) => string;

export function showAdminLoginSuccessToast(tFeedback: FeedbackTranslator, username: string) {
  toast.success(tFeedback("loginSuccess"), {
    id: `admin-login-success-${username}`,
    description: tFeedback("loginSuccessDesc", { username }),
  });
}

function AdminLoginSuccessToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tFeedback = useTranslations("admin.feedback");

  useEffect(() => {
    if (searchParams.get("login") !== "success") return;
    const username = searchParams.get("username")?.trim();
    if (!username) return;

    showAdminLoginSuccessToast(tFeedback, username);
    router.replace("/admin/dashboard");
  }, [searchParams, tFeedback, router]);

  return null;
}

export function AdminLoginSuccessToast() {
  return (
    <Suspense fallback={null}>
      <AdminLoginSuccessToastInner />
    </Suspense>
  );
}
