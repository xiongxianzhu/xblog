"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const LG_MEDIA = "(min-width: 1024px)";

type EditorAiAssistantLayoutProps = {
  className?: string;
  assistantOpen: boolean;
  editor: ReactNode;
  assistant: ReactNode;
};

export function EditorAiAssistantLayout({
  className,
  assistantOpen,
  editor,
  assistant,
}: EditorAiAssistantLayoutProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [pairedHeight, setPairedHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!assistantOpen) {
      setPairedHeight(null);
      return;
    }

    const node = editorRef.current;
    if (!node) return;

    const sync = () => {
      if (!window.matchMedia(LG_MEDIA).matches) {
        setPairedHeight(null);
        return;
      }
      setPairedHeight(Math.round(node.getBoundingClientRect().height));
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    window.addEventListener("resize", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [assistantOpen]);

  return (
    <div
      className={cn(
        "grid min-h-0 gap-4",
        assistantOpen && "lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start",
        className,
      )}
    >
      <div ref={editorRef} className="min-w-0">
        {editor}
      </div>
      {assistantOpen ? (
        <div
          className="flex min-h-0 flex-col overflow-hidden max-h-[min(720px,calc(100dvh-10rem))] lg:max-h-none"
          style={
            pairedHeight != null
              ? { height: pairedHeight, maxHeight: pairedHeight }
              : undefined
          }
        >
          {assistant}
        </div>
      ) : null}
    </div>
  );
}
