import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { locales, routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const localeAdminPath = new RegExp(`^/(${locales.join("|")})(/admin(?:/.*)?)$`);

function isAdminPathname(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isSiteIconPath(pathname: string): boolean {
  return pathname === "/site-icon" || pathname === "/favicon.ico";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isSiteIconPath(pathname)) {
    return NextResponse.next();
  }

  const adminMatch = pathname.match(localeAdminPath);

  if (adminMatch) {
    const [, , adminPath] = adminMatch;
    const url = request.nextUrl.clone();
    url.pathname = adminPath;
    // Legacy locale-prefixed admin links must not change either preference.
    return NextResponse.redirect(url);
  }

  if (isAdminPathname(pathname)) {
    // Vite's base requires the slash; skip Next's inverse redirect in development.
    if (process.env.NODE_ENV === "development" && pathname === "/admin") {
      const url = new URL(request.url);
      url.pathname = "/admin/";
      return NextResponse.redirect(url);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/",
    "/admin",
    "/admin/:path*",
    "/(zh-CN|zh-TW|en)/:path*",
    "/((?!api|_next|_vercel|site-icon|favicon\\.ico|.*\\..*).*)",
  ],
};
