import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:10242";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        { source: "/favicon.ico", destination: "/site-icon" },
        { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      ],
      fallback: [],
    };
  },
};

export default withNextIntl(nextConfig);
