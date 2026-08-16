"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "arioo-pwa-install-dismissed";

// Chrome/Edge's own BeforeInstallPromptEvent type isn't in lib.dom yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function useServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure (e.g. unsupported browser) shouldn't break the app.
    });
  }, []);
}

export function PwaProvider() {
  useServiceWorkerRegistration();

  const t = useTranslations("pwa");
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end">
      <div className="flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg">
        <div className="flex-1">
          <p className="text-sm font-semibold">{t("installTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("installDescription")}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              <Download />
              {t("installButton")}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {t("dismissButton")}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismissButton")}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
