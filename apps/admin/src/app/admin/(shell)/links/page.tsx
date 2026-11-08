import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { AdminFeedbackDialog, type AdminFeedbackVariant } from "@/components/admin/admin-feedback-dialog";
import { AdminListSearch } from "@/components/admin/admin-list-search";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { adminFlatButtonClass } from "@/components/admin/ai-assistant-form-styles";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { deleteAdminLink, listAdminLinks } from "@/lib/api";
import { matchQuery } from "@/lib/match-query";
import { useRouter } from "@/lib/navigation";
import { resolveAdminAssetPreviewUrl } from "@/lib/public-asset-url";
import type { FriendLinkPublic } from "@/lib/types";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";
export default function AdminLinksPage() {
  const txt = useAdminMessages();
  const router = useRouter();
  const { data: links, error, isLoading, mutate } = useSWR("admin-links", listAdminLinks);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<FriendLinkPublic | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    variant: AdminFeedbackVariant;
    title: string;
    message?: string;
  }>({
    open: false,
    variant: "success",
    title: "",
  });
  const filtered = useMemo(
    () =>
      (links ?? []).filter((link) =>
        matchQuery(search, link.name, link.url, link.logo_url, link.description, link.sort_order),
      ),
    [links, search],
  );
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminLink(deleteTarget.id);
      await mutate();
      setDeleteTarget(null);
      setFeedback({
        open: true,
        variant: "success",
        title: txt("m0047"),
        message: txt("m0048"),
      });
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: txt("m0049"),
        message: getAdminErrorMessage(err),
      });
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div>
      <AdminPageHeader
        title={txt("m0050")}
        description={txt("m0051")}
        actions={
          <Button onClick={() => router.push("/admin/links/new")} className={adminFlatButtonClass}>
            <PlusIcon data-icon="inline-start" />
            {txt("m0041")}
          </Button>
        }
      />

      <div className="mb-4">
        <AdminListSearch value={search} onChange={setSearch} placeholder={txt("m0052")} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{txt("m0053")}</p> : null}

      {!isLoading && !error && (links ?? []).length === 0 ? (
        <EmptyState title={txt("m0054")} description={txt("m0055")} />
      ) : null}

      {!isLoading && !error && (links ?? []).length > 0 && filtered.length === 0 ? (
        <EmptyState title={txt("m0056")} description={txt("m0057")} />
      ) : null}

      {!isLoading && filtered.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{txt("m0058")}</CardTitle>
            <CardDescription>{txt("m0059")}</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{txt("m0060")}</TableHead>
                  <TableHead className="w-16">{txt("m0799")}</TableHead>
                  <TableHead>{txt("m0061")}</TableHead>
                  <TableHead>{txt("m0569")}</TableHead>
                  <TableHead>{txt("m0062")}</TableHead>
                  <TableHead className="text-right">{txt("m0063")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((link) => {
                  const logoPreview = resolveAdminAssetPreviewUrl(link.logo_url);
                  return (
                    <TableRow key={link.id}>
                      <TableCell className="text-muted-foreground">{link.sort_order}</TableCell>
                      <TableCell>
                        <div className="mx-auto flex size-10 items-center justify-center">
                          {logoPreview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoPreview} alt="" className="max-h-10 max-w-10 object-contain" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{link.name}</TableCell>
                      <TableCell className="max-w-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-1">
                          <span className="min-w-0 truncate">{link.url}</span>
                          <CopyFieldButton value={link.url} label={txt("m0064")} />
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate text-muted-foreground">
                        {link.description?.trim() ? link.description : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            aria-label={txt("m0065", {
                              p0: link.name,
                            })}
                            title={txt("m0039")}
                            variant="ghost"
                            size="icon"
                            className={adminFlatButtonClass}
                            onClick={() => router.push(`/admin/links/${link.id}/edit`)}
                          >
                            <PencilIcon data-icon="inline-start" />
                          </Button>
                          <Button
                            aria-label={txt("m0066", {
                              p0: link.name,
                            })}
                            title={txt("m0067")}
                            variant="ghost"
                            size="icon"
                            className={cn("text-destructive", adminFlatButtonClass)}
                            onClick={() => setDeleteTarget(link)}
                          >
                            <Trash2Icon data-icon="inline-start" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <AdminConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={txt("m0068")}
        description={
          deleteTarget
            ? txt("m0069", {
                p0: deleteTarget.name,
              })
            : ""
        }
        confirmLabel={txt("m0070")}
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      <AdminFeedbackDialog
        open={feedback.open}
        onOpenChange={(open) =>
          setFeedback((prev) => ({
            ...prev,
            open,
          }))
        }
        variant={feedback.variant}
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
