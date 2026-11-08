import { Alert, Button, Spin, Tag } from "antd";
import { CalendarDays, Clock3, KeyRound, Pencil, UserRound } from "lucide-react";
import useSWR from "swr";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import { UserAvatar } from "@/components/admin/user-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { getAdminUser } from "@/lib/api";
import { useParams, useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { formatDateTime } from "@/lib/utils";
export default function UserDetailPage() {
  const txt = useAdminMessages();
  const { id } = useParams<{
    id: string;
  }>();
  const router = useRouter();
  const userId = Number(id);
  const validId = Number.isSafeInteger(userId) && userId > 0;
  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR(validId ? ["admin-user", userId] : null, () => getAdminUser(userId));
  const gender = {
    male: txt("m0250"),
    female: txt("m0251"),
    other: txt("m0252"),
  };
  return (
    <div>
      <AdminPageHeader
        title={txt("m0253")}
        description={txt("m0254")}
        actions={<Button onClick={() => router.push("/admin/users")}>{txt("m0255")}</Button>}
      />
      {!validId ? (
        <Alert type="error" title={txt("m0256")} />
      ) : error ? (
        <Alert
          type="error"
          title={txt("m0257")}
          description={getAdminErrorMessage(error)}
          action={<Button onClick={() => void mutate()}>{txt("m0028")}</Button>}
        />
      ) : isLoading || !user ? (
        <Spin />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <UserAvatar preview username={user.username} avatarUrl={user.avatar_url} size="lg" />
                <div className="min-w-0">
                  <h2 className="m-0 break-words text-xl font-semibold">{user.nickname || user.username}</h2>
                  <p className="mb-0 mt-1 break-all text-sm text-muted-foreground">
                    @{user.username}
                    {txt("m0258")}
                    {user.id}
                    <CopyFieldButton value={user.id} label={txt("m0259")} />
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag>{txt("m0260")}</Tag>
                    <Tag color={user.is_active ? "success" : "default"}>
                      {user.is_active ? txt("m0261") : txt("m0262")}
                    </Tag>
                  </div>
                </div>
              </div>
              <Button icon={<Pencil size={16} />} onClick={() => router.push(`/admin/users/${user.id}/edit`)}>
                {txt("m0263")}
              </Button>
            </div>
          </Card>
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound size={18} />
                  {txt("m0248")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="m-0 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                  {[
                    [txt("m0091"), user.username],
                    [txt("m0264"), user.nickname || "-"],
                    [txt("m0265"), user.gender ? gender[user.gender] : "-"],
                    [txt("m0266"), user.birth_date || "-"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd className="m-0 mt-2 flex items-center gap-1 font-medium">
                        <span className="min-w-0 break-words">{value}</span>
                        {label === txt("m0091") ? (
                          <CopyFieldButton value={value} label={label ?? txt("m0267")} />
                        ) : null}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-7 border-t pt-6">
                  <h3 className="mb-5 mt-0 text-sm font-semibold">{txt("m0268")}</h3>
                  <dl className="m-0 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {[
                      [txt("m0269"), user.email],
                      [txt("m0270"), user.phone],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-sm text-muted-foreground">{label}</dt>
                        <dd className="m-0 mt-2 flex items-center gap-1 font-medium">
                          <span className="min-w-0 break-all">{value || "-"}</span>
                          <CopyFieldButton value={value} label={label ?? txt("m0268")} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound size={18} />
                    {txt("m0271")}
                  </CardTitle>
                </CardHeader>
                <p className="mb-2 font-medium">{user.must_change_password ? txt("m0272") : txt("m0273")}</p>
                <p className="mb-0 text-sm leading-6 text-muted-foreground">
                  {user.must_change_password ? txt("m0274") : txt("m0275")}
                </p>
                {!user.is_active ? (
                  <p className="mb-0 mt-3 text-sm text-muted-foreground">{txt("m0276")}</p>
                ) : null}
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock3 size={18} />
                    {txt("m0277")}
                  </CardTitle>
                </CardHeader>
                <dl className="m-0 space-y-5">
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays size={15} />
                      {txt("m0180")}
                    </dt>
                    <dd className="m-0 mt-2 pl-6 tabular-nums">{formatDateTime(user.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 size={15} />
                      {txt("m0278")}
                    </dt>
                    <dd className="m-0 mt-2 pl-6 tabular-nums">
                      {user.last_login_at ? formatDateTime(user.last_login_at) : "-"}
                    </dd>
                  </div>
                </dl>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
