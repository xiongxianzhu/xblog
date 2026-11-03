import { useMemo } from "react";
import {
  Navigate,
  useParams as params,
  useSearchParams as search,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { mutate } from "swr";
export function adminPath(path: string) {
  return path.replace(/^\/admin(?=\/|$)/, "") || "/";
}
export function useRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (p: string) => navigate(adminPath(p)),
      replace: (p: string) => navigate(adminPath(p), { replace: true }),
      refresh: () => {
        void mutate(
          (key) => typeof key === "string" && (key.startsWith("admin-") || key === "public-site-theme"),
        );
      },
    }),
    [navigate],
  );
}
export function usePathname() {
  const { pathname } = useLocation();
  return `/admin${pathname === "/" ? "" : pathname}`;
}
export function useSearchParams() {
  return search()[0];
}
export const useParams = params;
export function redirect(path: string) {
  return <Navigate to={adminPath(path)} replace />;
}
