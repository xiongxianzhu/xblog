import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "size-8 text-xs",
  md: "size-9 text-xs",
  lg: "size-14 text-base",
  xl: "size-24 text-xl",
} as const;

type UserAvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizeClass;
  className?: string;
};

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export function UserAvatar({ username, avatarUrl, size = "md", className }: UserAvatarProps) {
  return (
    <Avatar className={cn("admin-user-avatar rounded-full", sizeClass[size], className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={username} className="object-cover" /> : null}
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {initials(username)}
      </AvatarFallback>
    </Avatar>
  );
}
