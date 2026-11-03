import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:10242";

const isDevelopment = process.env.NODE_ENV === "development";
const adminDevUrl = process.env.ADMIN_DEV_URL ?? "http://127.0.0.1:10243";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: isDevelopment,
  async rewrites() {
    return {
      beforeFiles: isDevelopment
        ? [
            { source: "/admin/", destination: `${adminDevUrl}/admin/` },
            { source: "/admin/:path*", destination: `${adminDevUrl}/admin/:path*` },
          ]
        : [],
      afterFiles: [
        { source: "/favicon.ico", destination: "/site-icon" },
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      ],
      fallback: [],
    };
  },
};

export default withNextIntl(nextConfig);
