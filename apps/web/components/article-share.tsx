"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Check, Copy, QrCode, Share2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const QRCode = dynamic(() => import("@rc-component/qrcode").then((module) => module.QRCodeSVG), {
  ssr: false,
  loading: () => <div className="size-60 animate-pulse rounded bg-neutral-100" />,
});

export function ArticleShare({ title }: { title: string }) {
  const t = useTranslations("articleShare");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [feedback, setFeedback] = useState<"" | "copied" | "failed">("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setFeedback("copied");
    } catch {
      setFeedback("failed");
    }
  }
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 border-y border-border/60 py-5">
      <p className="m-0 text-sm text-muted-foreground">{t("intro")}</p>
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          if (next) {
            setUrl(`${window.location.origin}${window.location.pathname}`);
            setContainer(document.querySelector<HTMLElement>("[data-site-shell]"));
            setFeedback("");
          }
          setOpen(next);
        }}
      >
        <Dialog.Trigger asChild>
          <Button variant="outline">
            <Share2 className="size-4" />
            {t("button")}
          </Button>
        </Dialog.Trigger>
        {open ? (
          <Dialog.Portal container={container}>
            <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/45" />
            <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
              <Dialog.Title className="m-0 pr-8 font-serif text-xl font-semibold">{t("title")}</Dialog.Title>
              <Dialog.Description className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
                {t("description")}
              </Dialog.Description>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={t("close")}
                  className="absolute right-3 top-3 flex size-9 items-center justify-center rounded hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <X className="size-4" />
                </button>
              </Dialog.Close>
              <p className="mb-4 break-words text-center text-sm font-medium">{title}</p>
              <div className="mx-auto w-fit max-w-full rounded border border-border bg-white p-2">
                <QRCode
                  value={url}
                  size={240}
                  level="M"
                  marginSize={4}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  style={{ maxWidth: "100%", height: "auto" }}
                  title={t("qrLabel")}
                />
              </div>
              <p className="my-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <QrCode className="size-4" />
                {t("scan")}
              </p>
              <input
                aria-label={t("linkLabel")}
                readOnly
                value={url}
                onFocus={(event) => event.target.select()}
                className="h-10 w-full rounded border border-input bg-background px-3 text-xs text-muted-foreground"
              />
              <Button className="mt-3 w-full" onClick={() => void copy()}>
                {feedback === "copied" ? <Check className="size-4" /> : <Copy className="size-4" />}
                {feedback === "copied" ? t("copied") : t("copy")}
              </Button>
              <p role="status" className="mb-0 mt-2 min-h-5 text-center text-xs text-muted-foreground">
                {feedback === "failed" ? t("copyFailed") : ""}
              </p>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </Dialog.Root>
    </section>
  );
}
