import type { MetadataRoute } from "next";

// Lives at the app root (not under [locale]) because Next.js file-convention
// routes can't be dynamic segments — this generates a single
// /manifest.webmanifest shared by all locales, in the default locale (uz),
// same as favicon/apple-icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arioo — AI xodim ijaraga oling",
    short_name: "Arioo",
    description: "Sotuv, qo'llab-quvvatlash, HR va marketing bo'limlariga jamoa a'zosi sifatida AI xodim qo'shing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#fbf8f4",
    theme_color: "#0950c3",
    lang: "uz",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
