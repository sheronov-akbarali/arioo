import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Arioo TMA | Mobil AI Boshqaruv",
  description: "Telegram Mini App for Arioo B2B SaaS",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TmaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      <div className="w-full max-w-md mx-auto min-h-screen bg-slate-950">
        {children}
      </div>
    </>
  );
}
