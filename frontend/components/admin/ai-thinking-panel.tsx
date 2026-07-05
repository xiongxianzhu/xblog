"use client";

import { cn } from "@/lib/utils";

type AiThinkingPanelProps = {
  thinking: string;
  streaming?: boolean;
  className?: string;
};

export function AiThinkingPanel({ thinking, streaming = false, className }: AiThinkingPanelProps) {
  if (!thinking && !streaming) return null;

  return (
    <details
      open={streaming || undefined}
      className={cn(
        "rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-left",
        className,
      )}
    >
      <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
        思考过程
        {streaming && !thinking ? "（等待模型…）" : null}
      </summary>
      {thinking ? (
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
          {thinking}
          {streaming ? (
            <span className="ml-0.5 inline-block animate-pulse text-primary" aria-hidden>
              ▍
            </span>
          ) : null}
        </pre>
      ) : null}
    </details>
  );
}
