import type { PostImportReport } from "@xblog/contracts";
import { Alert, Button, Modal, Table, Tag } from "antd";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { exportMarkdownPosts, importMarkdownPosts } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function PostExportButton({ postId }: { postId?: number }) {
  const txt = useAdminMessages();
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  async function download() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      const blob = await exportMarkdownPosts(postId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        postId === undefined
          ? `xblog-posts-${new Date().toISOString().slice(0, 10)}.zip`
          : `post-${postId}.md`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast.success(txt("m0660"), {
        description: txt("m0661"),
      });
    } catch (error) {
      toast.error(txt("m0662"), {
        description: getAdminErrorMessage(error),
      });
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <Button icon={<Download size={16} />} loading={busy} onClick={() => void download()}>
      {postId === undefined ? txt("m0663") : txt("m0664")}
    </Button>
  );
}
export function PostTransferActions({ onImported }: { onImported: () => Promise<unknown> }) {
  const txt = useAdminMessages();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const [report, setReport] = useState<PostImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  function reset() {
    setFiles([]);
    setReport(null);
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }
  async function importFiles() {
    if (running.current || !files.length) return;
    if (files.length > 1000 || files.reduce((size, file) => size + file.size, 0) > 50 * 1024 * 1024) {
      setError(txt("m0665"));
      return;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await importMarkdownPosts(files);
      setReport(result);
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
      if (result.imported) {
        try {
          await onImported();
        } catch {
          toast.warning(txt("m0666"));
        }
      }
    } catch (error) {
      setError(getAdminErrorMessage(error));
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        icon={<Upload size={16} />}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        {txt("m0668")}
      </Button>
      <PostExportButton />
      <Modal
        title={txt("m0669")}
        open={open}
        onCancel={() => {
          if (!busy) setOpen(false);
        }}
        closable={!busy}
        keyboard={!busy}
        maskClosable={!busy}
        width={720}
        footer={
          <div className="flex justify-end gap-2">
            <Button disabled={busy} onClick={() => setOpen(false)}>
              {txt("m0510")}
            </Button>
            <Button type="primary" loading={busy} disabled={!files.length} onClick={() => void importFiles()}>
              {txt("m0670")}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{txt("m0671")}</p>
          <p className="text-sm text-muted-foreground">{txt("m0672")}</p>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".md,.markdown,.zip"
            className="hidden"
            onChange={(event) => {
              setFiles(Array.from(event.target.files ?? []));
              setReport(null);
              setError(null);
            }}
          />
          <Button disabled={busy} icon={<Upload size={16} />} onClick={() => fileInput.current?.click()}>
            {txt("m0673")}
          </Button>
          {files.length ? (
            <p className="break-words text-sm">
              {txt("selectedFiles", { count: files.length })}
              {files
                .slice(0, 5)
                .map((file) => file.name)
                .join("、")}
              {files.length > 5 ? "…" : ""}
            </p>
          ) : null}
          {busy ? <p role="status">{txt("m0676")}</p> : null}
          {error ? <Alert type="error" title={localizeAdminNotice(error)} showIcon /> : null}
          {report ? (
            <>
              <Alert
                type={report.failed ? "warning" : "success"}
                showIcon
                title={txt("m0677", {
                  p0: report.imported,
                  p1: report.skipped,
                  p2: report.failed,
                })}
              />
              <Table
                size="small"
                scroll={{
                  x: 520,
                }}
                rowKey="key"
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false,
                }}
                dataSource={report.results.map((item, index) => ({
                  ...item,
                  key: index,
                }))}
                columns={[
                  {
                    title: txt("m0678"),
                    dataIndex: "filename",
                    ellipsis: true,
                  },
                  {
                    title: txt("m0093"),
                    dataIndex: "status",
                    width: 90,
                    render: (status: string) => (
                      <Tag
                        color={status === "imported" ? "success" : status === "failed" ? "error" : "default"}
                      >
                        {status === "imported"
                          ? txt("m0081")
                          : status === "failed"
                            ? txt("m0082")
                            : txt("m0679")}
                      </Tag>
                    ),
                  },
                  {
                    title: txt("m0680"),
                    dataIndex: "message",
                    render: (message: string) => getAdminErrorMessage(message),
                  },
                ]}
              />
            </>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
