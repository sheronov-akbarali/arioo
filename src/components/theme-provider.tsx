"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { useEffect } from "react";

// next-themes injects its no-flash script via React.createElement("script", ...),
// which React 19.2+ flags as a dev-only false positive (the script only needs to
// run once during the initial SSR-parsed HTML; it's harmless on client re-renders).
// Upstream is inactive, so we filter just this one message.
// https://github.com/pacocoursey/next-themes/issues/387
function useSuppressScriptTagWarning() {
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === "string" &&
        args[0].includes("Encountered a script tag while rendering")
      ) {
        return;
      }
      originalError(...args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useSuppressScriptTagWarning();
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
