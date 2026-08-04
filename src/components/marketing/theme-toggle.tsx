"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

function subscribe() {
  return () => {};
}

// next-themes only knows the resolved theme after hydration, so we render a
// placeholder on the server and swap in the real toggle once mounted on the
// client, avoiding a hydration mismatch without setState-in-effect.
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

export function ThemeToggle() {
  const t = useTranslations("nav");
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    // tabIndex={-1}: an aria-hidden element must not be reachable by keyboard,
    // otherwise focus lands on a control screen readers cannot announce.
    return <Button variant="ghost" size="icon" aria-hidden tabIndex={-1} />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={t("themeToggle")}
    >
      {theme === "dark" ? "☀" : "☽"}
    </Button>
  );
}
