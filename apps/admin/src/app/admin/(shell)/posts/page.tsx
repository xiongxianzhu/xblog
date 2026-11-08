import { EyeIcon, PenLineIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRef, useState } from "react";
import useSWR from "swr";
import { AdminListFilter, BOOLEAN_FILTER_OPTIONS } from "@/components/admin/admin-list-filter";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ADMIN_DEFAULT_PAGE_SIZE, AdminPagination } from "@/components/admin/admin-pagination";
import { PostTransferActions } from "@/components/admin/post-transfer-actions";
import { EmptyState } from "@/components/empty-state";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { deletePost, listAdminPosts, updatePost } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { formatDateTime } from "@/lib/utils";
export default function AdminPostsPage() {
  const txt = useAdminMessages();
  const [filters, setFilters] = useState({
    status: "",
    is_pinned: "",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ADMIN_DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const { data, error, isLoading, mutate } = useSWR(["admin-posts", page, pageSize, search, filters], () =>
    listAdminPosts(page, pageSize, search, filters),
  );
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [pinningId, setPinningId] = useState<number | null>(null);
  const updatingRef = useRef(false);
  const posts = data?.items ?? [];
  const total = data?.total ?? 0;
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }
  async function confirmDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await deletePost(deleteId);
      await mutate();
      setDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }
  async function handleStatusChange(id: number, title: string, published: boolean) {
    if (updatingRef.current) return;
    updatingRef.current = true;
    setStatusUpdatingId(id);
    try {
      const saved = await updatePost(id, {
        status: published ? "published" : "draft",
      });
      toast.success(published ? txt("m0030") : txt("m0187"), {
        description: published
          ? txt("m0188", {
              p0: title,
            })
          : txt("m0189", {
              p0: title,
            }),
      });
      try {
        await mutate(
          (current) =>
            current
              ? {
                  ...current,
                  items: current.items.map((post) => (post.id === id ? saved : post)),
                }
              : current,
          false,
        );
        const refreshed = await mutate();
        if (refreshed && page > 1 && refreshed.items.length === 0) {
          setPage(Math.max(1, Math.ceil(refreshed.total / pageSize)));
        }
      } catch {
        toast.warning(txt("m0190"));
      }
    } catch (err) {
      toast.error(txt("m0191"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      updatingRef.current = false;
      setStatusUpdatingId(null);
    }
  }
  async function handleTogglePin(id: number, title: string, isPinned: boolean) {
    if (updatingRef.current) return;
    updatingRef.current = true;
    setPinningId(id);
    try {
      await updatePost(id, {
        is_pinned: !isPinned,
      });
      await mutate();
      toast.success(!isPinned ? txt("m0171") : txt("m0192"), {
        description: txt("m0193", {
          p0: title,
          p1: !isPinned ? txt("m0194") : txt("m0195"),
        }),
      });
    } catch (err) {
      toast.error(txt("m0196"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      updatingRef.current = false;
      setPinningId(null);
    }
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-muted-foreground">{txt("m0197")}</p>
        <Button variant="outline" onClick={() => void mutate()}>
          {txt("m0028")}
        </Button>
      </div>
    );
  }
  return (
    <div>
      <AdminPageHeader
        title={txt("m0198")}
        description={txt("m0199")}
        actions={
          <>
            <PostTransferActions
              onImported={async () => {
                await mutate();
              }}
            />
            <Button asChild>
              <Link href="/admin/posts/new">
                <PlusIcon data-icon="inline-start" />
                {txt("m0025")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminListSearch
          className="w-72 max-w-full shrink-0"
          value={search}
          onChange={handleSearchChange}
          placeholder={txt("m0200")}
        />

        <AdminListFilter
          label={txt("m0201")}
          value={filters.status}
          options={[
            {
              value: "draft",
              label: txt("m0170"),
            },
            {
              value: "published",
              label: txt("m0030"),
            },
          ]}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              status: value,
            }));
            setPage(1);
          }}
        />
        <AdminListFilter
          label={txt("m0202")}
          value={filters.is_pinned}
          options={BOOLEAN_FILTER_OPTIONS}
          onChange={(value) => {
            setFilters((current) => ({
              ...current,
              is_pinned: value,
            }));
            setPage(1);
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {!isLoading && total === 0 ? (
        <EmptyState
          title={search.trim() || filters.status || filters.is_pinned ? txt("m0056") : txt("m0203")}
          description={search.trim() || filters.status || filters.is_pinned ? txt("m0204") : txt("m0205")}
        />
      ) : null}

      {!isLoading && posts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{txt("m0206")}</CardTitle>
            <CardDescription>{txt("m0207")}</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{txt("m0208")}</TableHead>
                  <TableHead>{txt("m0202")}</TableHead>
                  <TableHead>{txt("m0209")}</TableHead>
                  <TableHead>{txt("m0180")}</TableHead>
                  <TableHead>{txt("m0181")}</TableHead>
                  <TableHead className="text-right">{txt("m0063")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="max-w-[12rem] sm:max-w-[240px]">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex min-w-0 items-center justify-center gap-2">
                          <Link
                            href={`/admin/posts/${post.id}`}
                            className="truncate font-medium hover:text-primary"
                          >
                            {post.title}
                          </Link>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={post.is_pinned}
                        aria-label={txt("m0210", {
                          p0: post.title,
                        })}
                        loading={pinningId === post.id}
                        disabled={pinningId !== null || statusUpdatingId !== null}
                        onCheckedChange={() => void handleTogglePin(post.id, post.title, post.is_pinned)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={post.status === "published"}
                        checkedChildren={txt("m0030")}
                        unCheckedChildren={txt("m0170")}
                        aria-label={txt("m0211", {
                          p0: post.title,
                        })}
                        title={post.status === "published" ? txt("m0212") : txt("m0213")}
                        loading={statusUpdatingId === post.id}
                        disabled={statusUpdatingId !== null || pinningId !== null}
                        onCheckedChange={(checked) => void handleStatusChange(post.id, post.title, checked)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDateTime(post.created_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDateTime(post.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button title={txt("m0094")} asChild variant="ghost" size="icon">
                          <Link
                            href={`/admin/posts/${post.id}`}
                            aria-label={txt("m0214", {
                              p0: post.title,
                            })}
                          >
                            <EyeIcon className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          title={txt("m0039")}
                          asChild
                          variant="ghost"
                          size="icon"
                          className="px-2 sm:px-3"
                        >
                          <Link
                            href={`/admin/posts/${post.id}/edit`}
                            aria-label={txt("m0065", {
                              p0: post.title,
                            })}
                          >
                            <PenLineIcon className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          title={txt("m0067")}
                          variant="ghost"
                          size="icon"
                          className="px-2 text-destructive sm:px-3"
                          aria-label={txt("m0066", {
                            p0: post.title,
                          })}
                          onClick={() => setDeleteId(post.id)}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
              disabled={isLoading}
            />
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt("m0215")}</DialogTitle>
            <DialogDescription>{txt("m0216")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              {txt("m0217")}
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? txt("m0218") : txt("m0070")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
