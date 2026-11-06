import { Alert, Button, Empty, Progress, Skeleton, Tabs } from "antd";
import { AudioLines, Download, Eye, FolderCog, ImageIcon, Pencil, Play, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { MediaEditor } from "@/components/admin/media-editor";
import { MediaGroupManager } from "@/components/admin/media-group-manager";
import { MediaPreview } from "@/components/admin/media-preview";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/feedback";
import {
  deleteMedia,
  deleteMediaGroup,
  formatMediaSize,
  listMedia,
  listMediaGroups,
  MEDIA_TYPES,
  type MediaAsset,
  type MediaGroup,
  type MediaKind,
  uploadMedia,
} from "@/lib/media-api";
import { formatDateTime } from "@/lib/utils";

type DeleteTarget = { type: "asset"; value: MediaAsset } | { type: "group"; value: MediaGroup };

export default function MediaLibraryPage() {
  const [kind, setKind] = useState<MediaKind>("image");
  const [groupId, setGroupId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [manageGroups, setManageGroups] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadState, setUploadState] = useState<{ done: number; total: number } | null>(null);
  const [report, setReport] = useState<{ success: number; errors: string[] } | null>(null);
  const uploadLock = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { mutate } = useSWRConfig();
  const config = MEDIA_TYPES[kind];
  const { data, error, isLoading } = useSWR(["admin-media", kind, page, pageSize, query, groupId], () =>
    listMedia(kind, page, pageSize, query, groupId),
  );
  const { data: groups, error: groupError } = useSWR(["admin-media-groups", kind], () =>
    listMediaGroups(kind),
  );
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (data && !isLoading && page > Math.max(1, Math.ceil(data.total / pageSize)))
      setPage(Math.max(1, Math.ceil(data.total / pageSize)));
  }, [data, isLoading, page, pageSize]);

  async function refresh() {
    try {
      await mutate(
        (key) => Array.isArray(key) && (key[0] === "admin-media" || key[0] === "admin-media-groups"),
      );
    } catch {
      // SWR exposes refresh errors inline; an already-saved mutation must not be reported as failed.
    }
  }
  function chooseGroup(id: number | null) {
    setGroupId(id);
    setPage(1);
  }
  async function uploadFiles(files: File[]) {
    if (!files.length || uploadLock.current) return;
    uploadLock.current = true;
    setReport(null);
    setUploadState({ done: 0, total: files.length });
    let success = 0;
    const errors: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!config.accept.split(",").includes(extension)) errors.push(`${file.name}：不支持的文件格式`);
        else if (!file.size || file.size > config.limit * 1024 * 1024)
          errors.push(`${file.name}：文件不能为空且不能超过 ${config.limit} MB`);
        else {
          try {
            await uploadMedia(file, kind, groupId);
            success += 1;
          } catch (err) {
            errors.push(`${file.name}：${err instanceof Error ? err.message : "上传失败"}`);
          }
        }
        setUploadState({ done: index + 1, total: files.length });
      }
      setReport({ success, errors });
      setPage(1);
      await refresh();
    } finally {
      uploadLock.current = false;
      setUploadState(null);
    }
  }
  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "asset") await deleteMedia(deleteTarget.value.id);
      else {
        await deleteMediaGroup(deleteTarget.value.id);
        if (groupId === deleteTarget.value.id) chooseGroup(0);
      }
      setDeleteTarget(null);
      await refresh();
      toast.success("已删除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="素材库"
        description="集中管理图片、音频与视频，按分组整理并复制链接使用。"
        actions={
          <Button
            type="primary"
            icon={<Upload size={16} />}
            loading={!!uploadState}
            onClick={() => fileInput.current?.click()}
          >
            上传{config.label}
          </Button>
        }
      />
      <input
        ref={fileInput}
        type="file"
        aria-label="选择素材文件"
        accept={config.accept}
        multiple
        hidden
        disabled={!!uploadState}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void uploadFiles(files);
        }}
      />
      <Tabs
        activeKey={kind}
        onChange={(value) => {
          setKind(value as MediaKind);
          setGroupId(null);
          setSearch("");
          setQuery("");
          setPage(1);
          setReport(null);
        }}
        items={[
          { key: "image", label: "图片", icon: <ImageIcon size={16} />, disabled: !!uploadState },
          { key: "audio", label: "音频", icon: <AudioLines size={16} />, disabled: !!uploadState },
          { key: "video", label: "视频", icon: <Play size={16} />, disabled: !!uploadState },
        ]}
      />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              {config.label}素材（共 {groups?.total_count ?? 0} 个）
            </CardTitle>
            <Button
              icon={<FolderCog size={16} />}
              disabled={!!uploadState || !!groupError}
              onClick={() => setManageGroups(true)}
            >
              管理分组
            </Button>
          </div>
          <CardDescription>
            支持 {config.formats}，单个文件最大 {config.limit} MB。上传至：
            {groupId ? (groups?.items.find((group) => group.id === groupId)?.name ?? "当前分组") : "未分组"}。
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <fieldset
            className="m-0 mb-5 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
            aria-label="素材分组"
          >
            {[
              { id: null, name: "全部", count: groups?.total_count ?? 0 },
              { id: 0, name: "未分组", count: groups?.ungrouped_count ?? 0 },
              ...(groups?.items ?? []),
            ].map((group) => (
              <Button
                key={group.id ?? "all"}
                type={groupId === group.id ? "primary" : "default"}
                aria-pressed={groupId === group.id}
                disabled={!!uploadState}
                onClick={() => chooseGroup(group.id)}
              >
                {group.name}（{group.count}）
              </Button>
            ))}
          </fieldset>
          <div className="mb-5">
            <AdminListSearch
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="搜索素材名称或原文件名…"
            />
          </div>
          {uploadState ? (
            <div className="mb-5" role="status">
              <p className="mb-1 text-sm">
                正在上传 {uploadState.done} / {uploadState.total}，请保留此页面。
              </p>
              <Progress percent={Math.round((uploadState.done / uploadState.total) * 100)} />
            </div>
          ) : null}
          {report ? (
            <Alert
              className="mb-5"
              closable
              onClose={() => setReport(null)}
              type={report.errors.length ? "warning" : "success"}
              title={`已上传 ${report.success} 个素材${report.errors.length ? `，${report.errors.length} 个失败` : ""}`}
              description={
                report.errors.length ? (
                  <ul className="m-0 max-h-32 overflow-y-auto pl-4">
                    {[...new Set(report.errors)].map((message) => (
                      <li key={message} className="break-all">
                        {message}
                      </li>
                    ))}
                  </ul>
                ) : undefined
              }
            />
          ) : null}
          {groupError ? (
            <Alert
              className="mb-4"
              type="error"
              title="分组加载失败"
              action={<Button onClick={() => void refresh()}>重试</Button>}
            />
          ) : null}
          {isLoading ? (
            <Skeleton active paragraph={{ rows: 6 }} />
          ) : error ? (
            <Alert
              type="error"
              title="素材加载失败"
              description={error instanceof Error ? error.message : "请稍后重试"}
              action={<Button onClick={() => void refresh()}>重试</Button>}
            />
          ) : !data?.items.length ? (
            <Empty
              className="py-10"
              description={query ? "没有匹配的素材，请调整关键词。" : "当前分组暂无素材"}
            >
              <Button disabled={!!uploadState} onClick={() => fileInput.current?.click()}>
                上传{config.label}
              </Button>
            </Empty>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-4">
              {data.items.map((asset) => (
                <article
                  key={asset.id}
                  className="min-w-0 overflow-hidden rounded border border-border bg-card"
                >
                  <button
                    type="button"
                    className="flex aspect-[4/3] w-full cursor-zoom-in items-center justify-center border-0 bg-muted/30 p-3"
                    aria-label={`预览 ${asset.name}`}
                    onClick={() => setPreview(asset)}
                  >
                    {asset.kind === "image" ? (
                      <img
                        loading="lazy"
                        src={asset.url}
                        alt={asset.name}
                        className="h-full w-full object-contain"
                      />
                    ) : asset.kind === "audio" ? (
                      <AudioLines size={44} className="text-muted-foreground" />
                    ) : (
                      <Play size={44} className="text-muted-foreground" />
                    )}
                  </button>
                  <div className="p-3">
                    <p title={asset.name} className="mb-2 truncate text-sm font-medium">
                      {asset.name}
                    </p>
                    <div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
                      <span>{formatMediaSize(asset.size_bytes)}</span>
                      <time>{formatDateTime(asset.created_at)}</time>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-1 border-t pt-2">
                      <Button
                        type="text"
                        title="预览"
                        aria-label={`查看素材 ${asset.name}`}
                        icon={<Eye size={16} />}
                        onClick={() => setPreview(asset)}
                      />
                      <CopyFieldButton
                        label="素材链接"
                        value={new URL(asset.url, window.location.origin).href}
                      />
                      <Button
                        type="text"
                        title="下载原文件"
                        aria-label={`下载 ${asset.name}`}
                        href={`/api/v1/admin/media/${asset.id}/download`}
                        icon={<Download size={16} />}
                      />
                      <Button
                        type="text"
                        title="重命名或移动分组"
                        aria-label={`编辑素材 ${asset.name}`}
                        icon={<Pencil size={16} />}
                        onClick={() => setEditing(asset)}
                      />
                      <Button
                        type="text"
                        danger
                        title="删除"
                        aria-label={`删除素材 ${asset.name}`}
                        icon={<Trash2 size={16} />}
                        onClick={() => setDeleteTarget({ type: "asset", value: asset })}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
          {data && !error ? (
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              disabled={isLoading}
            />
          ) : null}
        </CardContent>
      </Card>
      {preview ? <MediaPreview asset={preview} onClose={() => setPreview(null)} /> : null}
      {editing ? (
        <MediaEditor
          key={editing.id}
          asset={editing}
          groups={groups?.items ?? []}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      ) : null}
      {manageGroups ? (
        <MediaGroupManager
          kind={kind}
          groups={groups?.items ?? []}
          onClose={() => setManageGroups(false)}
          onChanged={refresh}
          onDelete={(group) => setDeleteTarget({ type: "group", value: group })}
        />
      ) : null}
      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === "group" ? "删除分组" : "删除素材"}
        description={
          deleteTarget
            ? deleteTarget.type === "group"
              ? `删除分组「${deleteTarget.value.name}」？其中的素材将移入未分组，不会删除文件。`
              : `确定删除「${deleteTarget.value.name}」及其文件吗？此操作不可撤销；正在被内容引用的素材不可删除。`
            : ""
        }
        confirmLabel="确认删除"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
