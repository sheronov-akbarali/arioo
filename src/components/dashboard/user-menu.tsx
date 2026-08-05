"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function UserMenu({ name }: { name: string | null }) {
  const t = useTranslations("dashboard.userMenu");
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/sign-in");
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm">{name ?? t("anonymous")}</span>
      <Button variant="ghost" size="sm" onClick={handleSignOut}>
        {t("signOut")}
      </Button>
    </div>
  );
}
