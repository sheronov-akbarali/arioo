import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { AppClerkProvider } from "@/components/clerk-provider";

const geistSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
  const t = await getTranslations({ locale: resolvedLocale, namespace: "meta" });

  return {
    // Placeholder production domain — Next.js needs an absolute base to turn
    // the relative hreflang/OG URLs below into the fully-qualified ones
    // search engines require. Replace with the real domain before launch.
    metadataBase: new URL("https://arioo.uz"),
    title: t("title"),
    description: t("description"),
    alternates: {
      // Minimal site-root hreflang set. Per-page hreflang would need the
      // current pathname, which a layout-level generateMetadata does not
      // receive — revisit if/when SEO needs per-route alternates.
      languages: Object.fromEntries(
        routing.locales.map((loc) => [loc, `/${loc}`]),
      ),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: resolvedLocale,
      type: "website",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  // Defensive fallback only: proxy.ts (Task 4 Step 6) already redirects any
  // unrecognized locale segment to the default locale before a request ever
  // reaches this layout, so this branch should not trigger for real traffic.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AppClerkProvider>{children}</AppClerkProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
