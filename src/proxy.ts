import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routing } from "./i18n/routing";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

const handleI18nRouting = createIntlMiddleware(routing);

const isProtectedRoute = createRouteMatcher([
  "/(uz|ru|en)/dashboard(.*)",
  "/(uz|ru|en)/assistants(.*)",
  "/(uz|ru|en)/chats(.*)",
  "/(uz|ru|en)/calls(.*)",
  "/(uz|ru|en)/routines(.*)",
  "/(uz|ru|en)/crm(.*)",
  "/(uz|ru|en)/approvals(.*)",
  "/(uz|ru|en)/knowledge-bases(.*)",
  "/(uz|ru|en)/products(.*)",
  "/(uz|ru|en)/integrations(.*)",
  "/(uz|ru|en)/statistics(.*)",
  "/(uz|ru|en)/runs(.*)",
  "/(uz|ru|en)/templates(.*)",
  "/(uz|ru|en)/message-templates(.*)",
  "/(uz|ru|en)/code-agent(.*)",
  "/(uz|ru|en)/referral-program(.*)",
  "/(uz|ru|en)/affiliate-program(.*)",
  "/(uz|ru|en)/settings(.*)",
  "/(uz|ru|en)/onboarding(.*)",
]);

// White-label custom domains (settings/whitelabel) resolve to a public
// branded landing page (src/app/[locale]/(whitelabel)/wl/[orgId]) instead of
// the normal marketing site — never to the authenticated dashboard, since
// that's keyed off the logged-in Clerk user's own org memberships, not the
// requested domain. Fails open (falls through to normal routing) on any
// error or timeout so a slow/unreachable DB never breaks the main app.
async function resolveWhitelabelOrgId(host: string): Promise<string | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const primaryHost = appUrl ? new URL(appUrl).host : null;
    if (!primaryHost || host === primaryHost || host.endsWith(".vercel.app")) return null;

    const query = db.execute<{ id: string }>(
      sql`SELECT "id" FROM "organization" WHERE "whitelabel"::jsonb ->> 'customDomain' = ${host} LIMIT 1`
    );
    const result = await Promise.race([
      query,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);
    return (result?.rows[0] as { id: string } | undefined)?.id ?? null;
  } catch {
    return null;
  }
}

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get("host");
  if (host && !request.nextUrl.pathname.startsWith("/api")) {
    const whitelabelOrgId = await resolveWhitelabelOrgId(host);
    if (whitelabelOrgId) {
      const locale = request.nextUrl.pathname.split("/")[1];
      const validLocale = (routing.locales as readonly string[]).includes(locale) ? locale : routing.defaultLocale;
      return NextResponse.rewrite(new URL(`/${validLocale}/wl/${whitelabelOrgId}`, request.url));
    }
  }

  if (isProtectedRoute(request)) {
    const locale = request.nextUrl.pathname.split("/")[1] || routing.defaultLocale;
    await auth.protect({
      unauthenticatedUrl: new URL(`/${locale}/sign-in`, request.url).toString(),
    });
  }
  // API routes have no locale segment and authorize themselves via auth() —
  // next-intl's routing only applies to the localized page tree.
  if (request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next();
  }
  return handleI18nRouting(request);
});

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};
