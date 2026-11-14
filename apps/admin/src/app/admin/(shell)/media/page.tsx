import { Alert, Upload as AntUpload, Button, Empty, Progress, Skeleton, Tabs } from "antd";
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
import { MediaSelectableGrid } from "@/components/admin/media-selectable-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminErrorMessage } from "@/lib/admin-errors";
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
import { useAdminMessages } from "@/lib/use-admin-messages";
import { formatDateTime } from "@/lib/utils";

type DeleteTarget =
  | {
      type: "asset";
      value: MediaAsset;
    }
  | {
      type: "group";
      value: MediaGroup;
    };
export default function MediaLibraryPage() {
  const txt = useAdminMessages();
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
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadState, setUploadState] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [report, setReport] = useState<{
    success: number;
    errors: string[];
  } | null>(null);
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
    setUploadState({
      done: 0,
      total: files.length,
    });
    let success = 0;
    const errors: string[] = [];
    try {
      for (const [index, file] of files.entries()) {
        const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!config.accept.split(",").includes(extension))
          errors.push(
            txt("m0108", {
              p0: file.name,
            }),
          );
        else if (!file.size || file.size > config.limit * 1024 * 1024)
          errors.push(
            txt("m0109", {
              p0: file.name,
              p1: config.limit,
            }),
          );
        else {
          try {
            await uploadMedia(file, kind, groupId);
            success += 1;
          } catch (err) {
            errors.push(`${file.name}：${getAdminErrorMessage(err)}`);
          }
        }
        setUploadState({
          done: index + 1,
          total: files.length,
        });
      }
      setReport({
        success,
        errors,
      });
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
      toast.success(txt("m0047"));
    } catch (err) {
      toast.error(getAdminErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div inert={bulkDeleting}>
      <AdminPageHeader
        title={txt("m0111")}
        description={txt("m0112")}
        actions={
          <Button
            type="primary"
            icon={<Upload size={16} />}
            loading={!!uploadState}
            onClick={() => fileInput.current?.click()}
          >
            {txt("m0113")}
            {config.label}
          </Button>
        }
      />
      <input
        ref={fileInput}
        type="file"
        aria-label={txt("m0114")}
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
          {
            key: "image",
            label: txt("m0115"),
            icon: <ImageIcon size={16} />,
            disabled: !!uploadState,
          },
          {
            key: "audio",
            label: txt("m0116"),
            icon: <AudioLines size={16} />,
            disabled: !!uploadState,
          },
          {
            key: "video",
            label: txt("m0117"),
            icon: <Play size={16} />,
            disabled: !!uploadState,
          },
        ]}
      />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              {txt("mediaCount", { kind: config.label, count: groups?.total_count ?? 0 })}
            </CardTitle>
            <Button
              icon={<FolderCog size={16} />}
              disabled={!!uploadState || !!groupError}
              onClick={() => setManageGroups(true)}
            >
              {txt("m0120")}
            </Button>
          </div>
          <CardDescription>
            {txt("mediaUploadHint", {
              formats: config.formats.replaceAll("、", ", "),
              limit: config.limit,
              group: groupId
                ? (groups?.items.find((group) => group.id === groupId)?.name ?? txt("m0124"))
                : txt("m0125"),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          <div className="mb-6">
            <AntUpload.Dragger
              className="admin-file-dropzone"
              accept={config.accept}
              multiple
              disabled={!!uploadState}
              showUploadList={false}
              onDrop={(event) => {
                void uploadFiles(Array.from(event.dataTransfer.files));
              }}
              beforeUpload={(file, files) => {
                if (file === files[0]) void uploadFiles(files);
                return AntUpload.LIST_IGNORE;
              }}
            >
              <Upload size={24} className="mx-auto mb-2 text-primary" aria-hidden />
              <p className="font-medium">{txt("uploadMediaDrop")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{txt("uploadMediaDropHint")}</p>
            </AntUpload.Dragger>
          </div>
          <fieldset
            className="m-0 mb-5 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
            aria-label={txt("m0126")}
          >
            {[
              {
                id: null,
                name: txt("m0127"),
                count: groups?.total_count ?? 0,
              },
              {
                id: 0,
                name: txt("m0125"),
                count: groups?.ungrouped_count ?? 0,
              },
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
              placeholder={txt("m0128")}
            />
          </div>
          {uploadState ? (
            <div className="mb-5" role="status">
              <p className="mb-1 text-sm">
                {txt("m0129")}
                {uploadState.done} / {uploadState.total}
                {txt("m0130")}
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
              title={txt("m0131", {
                p0: report.success,
                p1: report.errors.length
                  ? txt("m0132", {
                      p0: report.errors.length,
                    })
                  : "",
              })}
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
              title={txt("m0133")}
              action={<Button onClick={() => void refresh()}>{txt("m0028")}</Button>}
            />
          ) : null}
          {isLoading ? (
            <Skeleton
              active
              paragraph={{
                rows: 6,
              }}
            />
          ) : error ? (
            <Alert
              type="error"
              title={txt("m0134")}
              description={getAdminErrorMessage(error)}
              action={<Button onClick={() => void refresh()}>{txt("m0028")}</Button>}
            />
          ) : !data?.items.length ? (
            <Empty className="py-10" description={query ? txt("m0135") : txt("m0136")}>
              <Button disabled={!!uploadState} onClick={() => fileInput.current?.click()}>
                {txt("m0113")}
                {config.label}
              </Button>
            </Empty>
          ) : (
            <MediaSelectableGrid
              key={`${kind}:${page}:${pageSize}:${groupId}:${query}`}
              items={data.items}
              disabled={!!uploadState || deleting}
              onDeleted={refresh}
              onBusyChange={setBulkDeleting}
            >
              {(asset, selected, checkbox) => (
                <article
                  key={asset.id}
                  data-media-id={asset.id}
                  className={`relative min-w-0 overflow-hidden rounded border bg-card ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}
                >
                  <div className="absolute left-2 top-2 z-10">{checkbox}</div>
                  <button
                    data-media-preview
                    onDragStart={(event) => event.preventDefault()}
                    type="button"
                    className="flex aspect-[4/3] w-full cursor-zoom-in items-center justify-center border-0 bg-muted/30 p-3"
                    aria-label={txt("m0137", {
                      p0: asset.name,
                    })}
                    onClick={() => setPreview(asset)}
                  >
                    {asset.kind === "image" ? (
                      <img
                        draggable={false}
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
                        title={txt("m0138")}
                        aria-label={txt("m0139", {
                          p0: asset.name,
                        })}
                        icon={<Eye size={16} />}
                        onClick={() => setPreview(asset)}
                      />
                      <CopyFieldButton
                        label={txt("m0140")}
                        value={new URL(asset.url, window.location.origin).href}
                      />
                      <Button
                        type="text"
                        title={txt("m0141")}
                        aria-label={txt("m0142", {
                          p0: asset.name,
                        })}
                        href={`/api/v1/admin/media/${asset.id}/download`}
                        icon={<Download size={16} />}
                      />
                      <Button
                        type="text"
                        title={txt("m0143")}
                        aria-label={txt("m0144", {
                          p0: asset.name,
                        })}
                        icon={<Pencil size={16} />}
                        onClick={() => setEditing(asset)}
                      />
                      <Button
                        type="text"
                        danger
                        title={txt("m0067")}
                        aria-label={txt("m0145", {
                          p0: asset.name,
                        })}
                        icon={<Trash2 size={16} />}
                        onClick={() =>
                          setDeleteTarget({
                            type: "asset",
                            value: asset,
                          })
                        }
                      />
                    </div>
                  </div>
                </article>
              )}
            </MediaSelectableGrid>
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
          onDelete={(group) =>
            setDeleteTarget({
              type: "group",
              value: group,
            })
          }
        />
      ) : null}
      <AdminConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.type === "group" ? txt("m0146") : txt("m0147")}
        description={
          deleteTarget
            ? deleteTarget.type === "group"
              ? txt("m0148", {
                  p0: deleteTarget.value.name,
                })
              : txt("m0149", {
                  p0: deleteTarget.value.name,
                })
            : ""
        }
        confirmLabel={txt("m0070")}
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
