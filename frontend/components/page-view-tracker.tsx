"use client";

import { useEffect } from "react";

import { recordPageView } from "@/lib/api";

export function PageViewTracker({ path }: { path: string }) {
  useEffect(() => {
    void recordPageView(path, document.referrer || undefined);
  }, [path]);

  return null;
}
