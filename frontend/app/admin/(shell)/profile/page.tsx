"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Link2Icon, MailIcon, PhoneIcon, UserRoundIcon } from "lucide-react";

import { AdminOAuthButtons } from "@/components/admin/admin-oauth-buttons";
import { EmailBinder } from "@/components/admin/email-binder";
import { PhoneBinder } from "@/components/admin/phone-binder";
import { ProfileBasicForm } from "@/components/admin/profile-basic-form";
import { ProfileHero } from "@/components/admin/profile/profile-hero";
import { ProfileSection } from "@/components/admin/profile/profile-section";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe, getOAuthLinks, getOAuthProviders } from "@/lib/api";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: "第三方绑定失败，请稍后重试。",
  oauth_already_linked: "该 GitHub / 微信账号已绑定其他管理员。",
};

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: user, error, isLoading, mutate } = useSWR("admin-me", getMe);
  const { data: providers } = useSWR("oauth-providers", getOAuthProviders);
  const { data: links, mutate: mutateLinks } = useSWR("oauth-links", getOAuthLinks);

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const oauthError = searchParams.get("error");

    if (oauth === "bound") {
      toast.success("绑定成功", { description: "下次可使用第三方账号登录。" });
      void mutateLinks();
    } else if (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) {
      toast.error("绑定失败", { description: OAUTH_ERROR_MESSAGES[oauthError] });
    }

    if (oauth || oauthError) {
      router.replace("/admin/profile");
    }
  }, [searchParams, mutateLinks, router]);

  return (
    <div className="admin-profile-page">
      <AdminPageHeader
        title="个人资料"
        description="头像、基本信息与登录方式分栏管理，信息更集中、更易维护。"
        actions={
          <Button asChild variant="outline" className="rounded-[2px]">
            <Link href="/admin/users">用户列表</Link>
          </Button>
        }
      />

      {isLoading ? (
        <ProfileSkeleton />
      ) : error ? (
        <p className="text-sm text-destructive">加载失败，请刷新页面。</p>
      ) : user ? (
        <div className="admin-profile-layout grid gap-6 lg:grid-cols-[minmax(260px,300px)_1fr] xl:gap-8">
          <ProfileHero user={user} oauthLinked={links} className="lg:sticky lg:top-[4.5rem] lg:self-start" />

          <div className="admin-profile-sections flex min-w-0 flex-col gap-5">
            <ProfileSection
              icon={UserRoundIcon}
              title="基本信息"
              description="昵称、出生日期与性别会同步到用户列表与右上角展示。"
            >
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
                title="邮箱"
                description="用于邮箱 + 密码登录与找回密码（需配置 SMTP）。"
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
                title="手机号"
                description="绑定后可在登录页使用短信验证码；需在设置中开启。"
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
              <ProfileSection
                icon={Link2Icon}
                title="第三方登录"
                description="绑定 GitHub 或微信后，可在登录页快捷登录。"
              >
                <AdminOAuthButtons providers={providers} mode="bind" links={links} className="max-w-md" />
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
