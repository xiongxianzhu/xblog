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
    return new NextResponse(null, { status: 404 });
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
