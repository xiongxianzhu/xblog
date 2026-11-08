import { Link2Icon, MailIcon, PhoneIcon, UserRoundIcon } from "lucide-react";
import { Suspense, useEffect } from "react";
import useSWR from "swr";
import { useTranslations } from "use-intl";
import { AdminOAuthButtons } from "@/components/admin/admin-oauth-buttons";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { EmailBinder } from "@/components/admin/email-binder";
import { PhoneBinder } from "@/components/admin/phone-binder";
import { ProfileHero } from "@/components/admin/profile/profile-hero";
import { ProfileSection } from "@/components/admin/profile/profile-section";

import { ProfileBasicForm } from "@/components/admin/profile-basic-form";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe, getOAuthLinks, getOAuthProviders } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter, useSearchParams } from "@/lib/navigation";

function ProfileSkeleton() {
  return (
    <div className="admin-profile-layout grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr] xl:gap-8">
      <Skeleton className="h-[32rem] rounded-[2px]" />

      <div className="flex flex-col gap-5">
        <Skeleton className="h-56 rounded-[2px]" />

        <div className="grid gap-5 md:grid-cols-2">
          <Skeleton className="h-52 rounded-[2px]" />

          <Skeleton className="h-52 rounded-[2px]" />
        </div>
      </div>
    </div>
  );
}

function ProfileContent() {
  const t = useTranslations("admin.profile");
  const router = useRouter();

  const searchParams = useSearchParams();

  const { data: user, error, isLoading, mutate } = useSWR("admin-me", getMe);

  const { data: providers } = useSWR("oauth-providers", getOAuthProviders);

  const { data: links, mutate: mutateLinks } = useSWR("oauth-links", getOAuthLinks);

  useEffect(() => {
    const oauth = searchParams.get("oauth");

    const oauthError = searchParams.get("error");

    if (oauth === "bound") {
      toast.success(t("linked"), { description: t("linkedDescription") });

      void mutateLinks();
    } else if (oauthError) {
      toast.error(t("linkFailed"), {
        description: t(oauthError === "oauth_already_linked" ? "oauthAlreadyLinked" : "oauthFailed"),
      });
    }

    if (oauth || oauthError) {
      router.replace("/admin/profile");
    }
  }, [searchParams, mutateLinks, router, t]);

  return (
    <div className="admin-profile-page">
      <AdminPageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button asChild variant="outline" className="rounded-[2px]">
            <Link href="/admin/users">{t("users")}</Link>
          </Button>
        }
      />

      {isLoading ? (
        <ProfileSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
      ) : user ? (
        <div className="admin-profile-layout grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr] xl:gap-8">
          <ProfileHero user={user} oauthLinked={links} className="lg:sticky lg:top-[4.5rem] lg:self-start" />

          <div className="admin-profile-sections flex min-w-0 flex-col gap-5">
            <ProfileSection icon={UserRoundIcon} title={t("basic")} description={t("basicDescription")}>
              <ProfileBasicForm
                embedded
                user={user}
                onUpdated={(next) => {
                  void mutate(next, false);
                }}
              />
            </ProfileSection>

            <div className="grid gap-5 md:grid-cols-2">
              <ProfileSection
                icon={MailIcon}
                title={t("email")}
                description={t("emailDescription")}
                className="h-full"
              >
                <EmailBinder
                  embedded
                  email={user.email}
                  onUpdated={(nextEmail) => {
                    void mutate({ ...user, email: nextEmail }, false);
                  }}
                />
              </ProfileSection>

              <ProfileSection
                icon={PhoneIcon}
                title={t("phone")}
                description={t("phoneDescription")}
                className="h-full"
              >
                <PhoneBinder
                  embedded
                  phone={user.phone}
                  onUpdated={(nextPhone) => {
                    void mutate({ ...user, phone: nextPhone }, false);
                  }}
                />
              </ProfileSection>
            </div>

            {providers && (providers.github || providers.wechat) ? (
              <ProfileSection icon={Link2Icon} title={t("oauth")} description={t("oauthDescription")}>
                <AdminOAuthButtons
                  providers={providers}
                  mode="bind"
                  links={links}
                  className="mx-auto w-full max-w-md"
                />
              </ProfileSection>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
