import { useTranslations } from "use-intl";

/** Subscribe each UI surface to the admin locale, including labels from shared option lists. */
export function useAdminMessages() {
  return useTranslations("admin.ui");
}
