import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_LOCALE_COOKIE_NAME, LOCALE_COOKIE_MAX_AGE, locales, routing } from "./i18n/routing";

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
    const [, locale, adminPath] = adminMatch;
    const url = request.nextUrl.clone();
    url.pathname = adminPath;
    const response = NextResponse.redirect(url);
    response.cookies.set(ADMIN_LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
    return response;
  }

  if (isAdminPathname(pathname)) {
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
