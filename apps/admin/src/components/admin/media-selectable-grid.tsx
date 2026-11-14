import { Alert, Button, Checkbox } from "antd";
import { Download, Trash2 } from "lucide-react";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { downloadMediaArchive } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { deleteMedia, type MediaAsset } from "@/lib/media-api";
import { useAdminMessages } from "@/lib/use-admin-messages";

type Point = { x: number; y: number };
export function MediaSelectableGrid({
  items,
  disabled,
  onDeleted,
  onBusyChange,
  children,
}: {
  items: MediaAsset[];
  disabled: boolean;
  onDeleted: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  children: (asset: MediaAsset, selected: boolean, checkbox: ReactNode) => ReactNode;
}) {
  const txt = useAdminMessages();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const lock = useRef(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<{ success: number; errors: string[] } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const drag = useRef<{ start: Point; initial: Set<number>; additive: boolean } | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const chosen = items.filter((item) => selected.has(item.id));
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || !grid.current) return;
    const { start, initial, additive } = drag.current;
    if (Math.hypot(event.pageX - start.x, event.pageY - start.y) < 4) return;
    dragged.current = true;
    event.preventDefault();
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const left = Math.min(start.x, event.pageX),
      top = Math.min(start.y, event.pageY);
    const right = Math.max(start.x, event.pageX),
      bottom = Math.max(start.y, event.pageY);
    const bounds = grid.current.getBoundingClientRect();
    setBox({
      left: left - bounds.left - window.scrollX,
      top: top - bounds.top - window.scrollY,
      width: right - left,
      height: bottom - top,
    });
    const next = new Set(additive ? initial : []);
    grid.current.querySelectorAll<HTMLElement>("[data-media-id]").forEach((card) => {
      const r = card.getBoundingClientRect();
      if (
        r.left + window.scrollX <= right &&
        r.right + window.scrollX >= left &&
        r.top + window.scrollY <= bottom &&
        r.bottom + window.scrollY >= top
      )
        next.add(Number(card.dataset.mediaId));
    });
    setSelected(next);
  }
  function finish() {
    drag.current = null;
    setBox(null);
  }
  async function removeSelected() {
    if (lock.current || !chosen.length) return;
    lock.current = true;
    setBusy(true);
    onBusyChange(true);
    setProgress(0);
    setReport(null);
    const failed = new Set<number>();
    const errors: string[] = [];
    let success = 0;
    try {
      for (const [index, item] of chosen.entries()) {
        try {
          await deleteMedia(item.id);
          success++;
        } catch (error) {
          failed.add(item.id);
          errors.push(`${item.name}: ${getAdminErrorMessage(error)}`);
        }
        setProgress(index + 1);
      }
      setSelected(failed);
      setReport({ success, errors });
      setConfirm(false);
      toast[errors.length ? "warning" : "success"](
        txt("mediaBatchResult", { success, failed: errors.length }),
      );
      await onDeleted();
    } finally {
      lock.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Checkbox
          disabled={disabled || busy}
          checked={chosen.length === items.length && items.length > 0}
          indeterminate={chosen.length > 0 && chosen.length < items.length}
          onChange={(event) => setSelected(new Set(event.target.checked ? items.map((item) => item.id) : []))}
        >
          {txt("mediaSelectPage")}
        </Checkbox>
        <span role="status">{txt("mediaSelectedCount", { count: chosen.length })}</span>
        <Button disabled={!chosen.length || disabled || busy} onClick={() => setSelected(new Set())}>
          {txt("mediaClearSelection")}
        </Button>
        <Button
          icon={<Download size={16} />}
          disabled={!chosen.length || disabled || busy}
          loading={downloading}
          title={txt("mediaZipHint")}
          onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setDownloading(true);
            onBusyChange(true);
            try {
              const blob = await downloadMediaArchive(chosen.map((item) => item.id));
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "xblog-media.zip";
              document.body.appendChild(link);
              link.click();
              link.remove();
              window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
            } catch (error) {
              toast.error(getAdminErrorMessage(error));
            } finally {
              lock.current = false;
              setBusy(false);
              setDownloading(false);
              onBusyChange(false);
            }
          }}
        >
          {txt("mediaDownloadZip")}
        </Button>
        <Button
          danger
          icon={<Trash2 size={16} />}
          disabled={!chosen.length || disabled || busy}
          onClick={() => setConfirm(true)}
        >
          {txt("mediaBatchDelete")}
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{txt("mediaMarqueeHint")}</p>
      {report ? (
        <Alert
          className="mb-4"
          type={report.errors.length ? "warning" : "success"}
          title={txt("mediaBatchResult", { success: report.success, failed: report.errors.length })}
          description={
            report.errors.length ? (
              <ul className="max-h-40 overflow-y-auto">
                {[...new Set(report.errors)].map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            ) : undefined
          }
        />
      ) : null}
      <div
        ref={grid}
        className="relative -mx-4 grid select-none grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4 p-4"
        onPointerDown={(event) => {
          dragged.current = false;
          if (
            disabled ||
            busy ||
            event.button !== 0 ||
            event.pointerType !== "mouse" ||
            (event.target as HTMLElement).closest(
              "button:not([data-media-preview]),a,input,label,.ant-checkbox-wrapper",
            )
          )
            return;
          if (!(event.target as HTMLElement).closest("[data-media-preview]")) event.preventDefault();
          drag.current = {
            start: { x: event.pageX, y: event.pageY },
            initial: new Set(selected),
            additive: event.ctrlKey || event.metaKey || event.shiftKey,
          };
        }}
        onPointerMove={move}
        onPointerLeave={() => {
          if (!dragged.current) finish();
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
        onClickCapture={(event) => {
          if (dragged.current) {
            event.preventDefault();
            event.stopPropagation();
            dragged.current = false;
          }
        }}
      >
        {items.map((asset) =>
          children(
            asset,
            selected.has(asset.id),
            <Checkbox
              className="media-card-checkbox"
              disabled={disabled || busy}
              checked={selected.has(asset.id)}
              aria-label={txt("mediaSelectFile", { name: asset.name })}
              onChange={(event) =>
                setSelected((previous) => {
                  const next = new Set(previous);
                  if (event.target.checked) next.add(asset.id);
                  else next.delete(asset.id);
                  return next;
                })
              }
            />,
          ),
        )}
        {box ? (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 border border-primary bg-primary/15"
            style={box}
          />
        ) : null}
      </div>
      <AdminConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={txt("mediaBatchDelete")}
        description={
          busy
            ? txt("mediaBatchProgress", { done: progress, total: chosen.length })
            : txt("mediaBatchConfirm", { count: chosen.length })
        }
        variant="destructive"
        loading={busy}
        onConfirm={removeSelected}
      />
    </>
  );
}
