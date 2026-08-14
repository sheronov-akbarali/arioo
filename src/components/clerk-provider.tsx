"use client";

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { useTheme } from "next-themes";

export function AppClerkProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      afterSignOutUrl="/uz"
      appearance={{
        theme: shadcn,
        variables: {
          colorPrimary: "oklch(0.6 0.11 175)",
          colorBackground: resolvedTheme === "dark" ? "oklch(0.145 0 0)" : "oklch(1 0 0)",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
