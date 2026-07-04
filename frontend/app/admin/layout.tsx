import { AdminThemeProvider } from "@/components/admin/theme-provider";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminThemeProvider>{children}</AdminThemeProvider>;
}
