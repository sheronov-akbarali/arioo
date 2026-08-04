import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
// global-not-found.tsx bypasses the app's normal layout tree entirely, so it
// must bring its own document shell, fonts, and styles rather than relying
// on [locale]/layout.tsx — this is what actually shells routes that don't
// match any segment at all (a typo'd URL), as opposed to [locale]/not-found.tsx,
// which only handles notFound() calls from within an already-matched locale route.
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "404 — TayanchAI",
  description: "Sahifa topilmadi / Страница не найдена / Page not found",
};

export default function GlobalNotFound() {
  return (
    <html lang="uz" className={`dark ${geistSans.variable}`}>
      <body className="flex min-h-screen items-center justify-center bg-background text-foreground antialiased">
        <section className="mx-auto max-w-lg px-6 py-24 text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Sahifa topilmadi</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Страница не найдена · Page not found
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-9 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-brand-foreground hover:opacity-90"
          >
            Bosh sahifaga qaytish
          </Link>
        </section>
      </body>
    </html>
  );
}
