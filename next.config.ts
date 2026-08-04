import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Enables app/global-not-found.tsx to shell truly unmatched routes (e.g. a
  // typo'd URL) with the site's real document/fonts/theme — otherwise those
  // fall through to Next's bare, unstyled default 404 with no <html> at all,
  // since app/layout.tsx is a locale-agnostic passthrough with no shell of
  // its own (see src/app/[locale]/not-found.tsx for the locale-aware case,
  // which only covers notFound() calls from within an already-matched route).
  experimental: {
    globalNotFound: true,
  },
};

export default withNextIntl(nextConfig);
