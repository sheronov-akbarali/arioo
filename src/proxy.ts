import createIntlMiddleware from "next-intl/middleware";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createIntlMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/(uz|ru|en)/dashboard(.*)",
  "/(uz|ru|en)/settings(.*)",
  "/(uz|ru|en)/onboarding(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    const locale = request.nextUrl.pathname.split("/")[1] || routing.defaultLocale;
    await auth.protect({
      unauthenticatedUrl: new URL(`/${locale}/sign-in`, request.url).toString(),
    });
  }
  return handleI18nRouting(request);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
