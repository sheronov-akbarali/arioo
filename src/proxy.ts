import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME } from "./lib/auth/cookies";

const handleI18nRouting = createMiddleware(routing);

const PROTECTED_SEGMENT = /^\/(uz|ru|en)\/(dashboard|settings|onboarding)(\/|$)/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PROTECTED_SEGMENT.test(pathname) && !request.cookies.get(SESSION_COOKIE_NAME)) {
    const locale = pathname.split("/")[1];
    return NextResponse.redirect(new URL(`/${locale}/sign-in`, request.url));
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
