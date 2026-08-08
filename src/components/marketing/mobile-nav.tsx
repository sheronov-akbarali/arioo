"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MenuIcon } from "lucide-react";
import { Show } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

// Below `md` the desktop <nav> in header.tsx is hidden, so this drawer is the
// only way to reach /pricing and /partners on a phone.
export function MobileNav() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("menu")} className="md:hidden" />
        }
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>{t("menu")}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 text-base">
          <Link
            href="/pricing"
            className="rounded-md py-2 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            {t("pricing")}
          </Link>
          <Link
            href="/partners"
            className="rounded-md py-2 text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            {t("partners")}
          </Link>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-md py-2 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {t("dashboardCta")}
            </Link>
          </Show>
          <Show when="signed-out">
            <Link
              href="/sign-in"
              className="rounded-md py-2 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              {t("login")}
            </Link>
          </Show>
        </nav>
        <div className="mt-2 flex items-center gap-2 border-t border-border px-4 pt-4">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
