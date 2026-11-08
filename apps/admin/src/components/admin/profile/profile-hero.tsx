import {
  CalendarIcon,
  KeyRoundIcon,
  MailIcon,
  Mars,
  PhoneIcon,
  SettingsIcon,
  Venus,
  VenusAndMars,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { AvatarEditor } from "@/components/admin/avatar-editor";
import { CopyFieldButton } from "@/components/admin/copy-field-button";
import Link from "@/components/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminUserMe } from "@/lib/api";
import { cn } from "@/lib/utils";

type ProfileHeroProps = {
  user: AdminUserMe;
  oauthLinked?: { github?: boolean; wechat?: boolean };
  className?: string;
};

function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <Badge variant={active ? "default" : "secondary"} className="rounded-[2px] font-normal">
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

export function ProfileHero({ user, oauthLinked, className }: ProfileHeroProps) {
  const t = useTranslations("admin.profile");
  const tGender = useTranslations("admin.gender");
  const GenderIcon = user.gender === "male" ? Mars : user.gender === "female" ? Venus : VenusAndMars;
  const displayName = user.nickname?.trim() || user.username;
  const hasNickname = Boolean(user.nickname?.trim());
  const filledCount = [user.nickname?.trim(), user.birth_date, user.gender, user.email, user.phone].filter(
    Boolean,
  ).length;
  const completion = Math.round((filledCount / 5) * 100);

  return (
    <aside
      className={cn(
        "admin-profile-hero flex flex-col gap-5 rounded-[2px] border border-border/70 bg-card/70 p-5 backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center text-center">
        <AvatarEditor username={user.username} avatarUrl={user.avatar_url} size="xl" layout="stacked" />
        <h2 className="mt-4 font-serif text-xl font-medium tracking-tight">{displayName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasNickname ? `@${user.username}` : user.username}
          <span className="mx-1.5 text-border">·</span>
          {t("administrator")}
        </p>
      </div>

      <div className="space-y-3 border-y border-border/60 py-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{t("completion")}</span>
          <span className="font-medium tabular-nums">{completion}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <StatusBadge
          active={Boolean(user.email)}
          activeLabel={t("emailLinked")}
          inactiveLabel={t("emailUnlinked")}
        />
        <StatusBadge
          active={Boolean(user.phone)}
          activeLabel={t("phoneLinked")}
          inactiveLabel={t("phoneUnlinked")}
        />
        {oauthLinked?.github ? (
          <Badge variant="default" className="rounded-[2px] font-normal">
            {t("githubLinked")}
          </Badge>
        ) : null}
        {oauthLinked?.wechat ? (
          <Badge variant="default" className="rounded-[2px] font-normal">
            {t("wechatLinked")}
          </Badge>
        ) : null}
      </div>

      {(user.birth_date || user.gender) && (
        <dl className="grid grid-cols-2 gap-3 text-xs">
          {user.gender ? (
            <div className="flex flex-col items-center justify-center rounded-[2px] border border-border/50 bg-muted/30 px-3 py-2.5 text-center">
              <dt className="flex items-center gap-1 text-muted-foreground">{tGender("label")}</dt>
              <dd
                className="m-0 mt-1 flex items-center justify-center gap-1.5 text-primary"
                title={tGender(user.gender)}
              >
                <span>{tGender(user.gender)}</span>
                <GenderIcon size={19} className="shrink-0" aria-hidden />
              </dd>
            </div>
          ) : null}
          {user.birth_date ? (
            <div className="flex flex-col items-center justify-center rounded-[2px] border border-border/50 bg-muted/30 px-3 py-2.5 text-center">
              <dt className="flex items-center gap-1 text-muted-foreground">
                <CalendarIcon className="size-3" />
                {t("birth")}
              </dt>
              <dd className="m-0 mt-1 font-medium tabular-nums">{user.birth_date}</dd>
            </div>
          ) : null}
        </dl>
      )}

      {(user.email || user.phone) && (
        <div className="space-y-2 text-xs">
          {user.email ? (
            <p className="flex items-center gap-2 truncate text-muted-foreground">
              <MailIcon className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{user.email}</span>
              <CopyFieldButton value={user.email} label={t("email")} />
            </p>
          ) : null}
          {user.phone ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <PhoneIcon className="size-3.5 shrink-0" />
              {user.phone}
              <CopyFieldButton value={user.phone} label={t("phone")} />
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-1">
        <Button asChild variant="outline" className="h-9 w-full justify-start rounded-[2px]">
          <Link href="/admin/password">
            <KeyRoundIcon className="size-4" />
            {t("password")}
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="h-9 w-full justify-start rounded-[2px] text-muted-foreground"
        >
          <Link href="/admin/settings">
            <SettingsIcon className="size-4" />
            {t("settings")}
          </Link>
        </Button>
      </div>
    </aside>
  );
}
