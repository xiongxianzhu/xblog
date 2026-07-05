import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { AdminToaster } from "@/components/admin/admin-toaster";
import { AdminThemeProvider } from "@/components/admin/theme-provider";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AdminThemeProvider>
        {children}
        <AdminToaster />
      </AdminThemeProvider>
    </NextIntlClientProvider>
  );
}
