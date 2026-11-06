import { Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/feedback";

export function CopyFieldButton({
  value,
  label,
}: {
  value: string | number | null | undefined;
  label: string;
}) {
  const [copying, setCopying] = useState(false);
  if (value === null || value === undefined || String(value).trim() === "") return null;
  return (
    <button
      type="button"
      title={`复制${label}`}
      aria-label={`复制${label}`}
      disabled={copying}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded border-0 bg-transparent align-middle text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
      onClick={async (event) => {
        event.stopPropagation();
        setCopying(true);
        try {
          await navigator.clipboard.writeText(String(value));
          toast.success(`${label}已复制`, { id: "copy-field" });
        } catch {
          toast.error("复制失败", { id: "copy-field", description: "请选中内容后手动复制。" });
        } finally {
          setCopying(false);
        }
      }}
    >
      <Copy size={14} aria-hidden />
    </button>
  );
}
