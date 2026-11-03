import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router-dom";
import { adminPath } from "@/lib/navigation";
export default function Link({
  href,
  prefetch: _prefetch,
  ...props
}: Omit<ComponentProps<"a">, "href"> & { href: string; prefetch?: boolean }) {
  return href.startsWith("/admin") ? (
    <RouterLink to={adminPath(href)} {...props} />
  ) : (
    <a href={href} {...props} />
  );
}
