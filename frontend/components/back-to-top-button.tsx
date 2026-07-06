"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const SCROLL_TOP_TOLERANCE = 12;

function getScrollThreshold() {
  if (typeof window === "undefined") return 400;
  return Math.max(400, Math.round(window.innerHeight * 0.45));
}

function BackToTopRocketBody() {
  return (
    <svg
      className="back-to-top-rocket-svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 2.5L16.2 19.2C16.35 19.85 15.8 20.5 15.1 20.5H8.9C8.2 20.5 7.65 19.85 7.8 19.2L12 2.5Z"
        fill="currentColor"
      />
      <circle cx="12" cy="11.2" r="2.1" className="back-to-top-rocket-window" />
      <path
        d="M8.9 20.5L6.2 23.4L8.4 22.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.1 20.5L17.8 23.4L15.6 22.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="9.1" y="19.8" width="5.8" height="2.2" rx="0.6" fill="currentColor" />
    </svg>
  );
}

function BackToTopRocketFlame() {
  return (
    <svg
      className="back-to-top-flame-svg"
      viewBox="0 0 24 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g className="back-to-top-flame">
        <path
          className="back-to-top-flame-outer"
          d="M6.8 0.8C7.8 5.4 9.2 10 10.4 11C10.8 9.4 11.2 6 10.2 1.4C9.2 1.1 8 0.9 6.8 0.8Z"
        />
        <path
          className="back-to-top-flame-core"
          d="M10.2 1C11.2 7.8 12 12.2 12.8 12.6C13.6 12.2 14.4 7.8 15.4 1C13.8 1.4 12.2 1.4 10.2 1Z"
        />
        <path
          className="back-to-top-flame-outer"
          d="M17.2 0.8C16.2 5.4 14.8 10 13.6 11C13.2 9.4 12.8 6 13.8 1.4C14.8 1.1 16 0.9 17.2 0.8Z"
        />
        <path
          className="back-to-top-flame-plume"
          d="M11.2 1.2C11.8 8.4 12 13 12 13C12 13 12.2 8.4 12.8 1.2C12.4 1.3 11.6 1.3 11.2 1.2Z"
        />
      </g>
    </svg>
  );
}

export function BackToTopButton() {
  const t = useTranslations("common");
  const [visible, setVisible] = useState(false);
  const [ascending, setAscending] = useState(false);
  const ascendingRef = useRef(false);

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;

    if (ascendingRef.current) {
      setVisible(true);

      if (scrollY <= SCROLL_TOP_TOLERANCE) {
        ascendingRef.current = false;
        setAscending(false);
        setVisible(false);
      }
      return;
    }

    setVisible(scrollY > getScrollThreshold());
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  function handleClick() {
    if (ascendingRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      ascendingRef.current = true;
      setAscending(true);
      setVisible(true);
    }

    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });

    if (prefersReducedMotion) {
      queueMicrotask(() => handleScroll());
    }
  }

  return (
    <button
      type="button"
      aria-label={t("backToTop")}
      title={t("backToTop")}
      onClick={handleClick}
      className={cn(
        "back-to-top-btn",
        visible && "back-to-top-btn--visible",
        ascending && "back-to-top-btn--ascending",
      )}
    >
      <span className="back-to-top-rocket-wrap" aria-hidden>
        <BackToTopRocketBody />
      </span>
      <span className="back-to-top-flame-zone" aria-hidden>
        <span className="back-to-top-trail-glow" />
        <span className="back-to-top-trail" />
        <span className="back-to-top-exhaust">
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        <BackToTopRocketFlame />
      </span>
    </button>
  );
}
