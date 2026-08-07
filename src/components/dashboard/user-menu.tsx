"use client";

import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function UserMenu({ name }: { name: string | null }) {
  const t = useTranslations("dashboard.userMenu");
  const { signOut } = useClerk();

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{name ?? t("anonymous")}</span>
      <Button variant="ghost" size="sm" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
        {t("signOut")}
      </Button>
    </div>
  );
}
