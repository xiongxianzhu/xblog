import { Avatar } from "antd";
export function UserAvatar({
  username,
  avatarUrl,
  size = "md",
  className,
}: {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  return (
    <Avatar src={avatarUrl} size={{ sm: 32, md: 36, lg: 56, xl: 96 }[size]} className={className}>
      {username.slice(0, 2).toUpperCase()}
    </Avatar>
  );
}
