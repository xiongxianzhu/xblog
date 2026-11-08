import { useEffect, useRef } from "react";
import { useLocale } from "use-intl";
import { useAdminTheme } from "@/components/admin/theme-provider";
import { adminText } from "@/lib/admin-messages";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

type AdminTurnstileProps = {
  siteKey: string;
  onSuccess: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
};
type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      language?: "en" | "zh-cn" | "zh-tw";
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), {
        once: true,
      });
      existing.addEventListener("error", () => reject(new Error(adminText("m0361"))), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(adminText("m0361")));
    document.head.appendChild(script);
  });
  return scriptPromise;
}
export function AdminTurnstile({ siteKey, onSuccess, onExpire, onError, className }: AdminTurnstileProps) {
  useAdminMessages();
  const locale = useLocale();
  const { resolvedMode } = useAdminTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onSuccess, onExpire, onError]);
  useEffect(() => {
    let cancelled = false;
    async function mountWidget() {
      await loadTurnstileScript();
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        language: locale === "en" ? "en" : locale === "zh-TW" ? "zh-tw" : "zh-cn",
        theme: resolvedMode === "dark" ? "dark" : "light",
        size: "flexible",
        callback: (token) => onSuccessRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
        "error-callback": () => onErrorRef.current?.(),
      });
    }
    void mountWidget().catch(() => {
      if (!cancelled) onErrorRef.current?.();
    });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resolvedMode, locale]);
  return <div ref={containerRef} className={cn("admin-turnstile min-w-0 w-full", className)} />;
}
