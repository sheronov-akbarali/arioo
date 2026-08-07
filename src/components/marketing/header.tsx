import { useTranslations } from "next-intl";
import { Show, UserButton } from "@clerk/nextjs";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          TayanchAI
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/pricing" className="hover:text-foreground">
            {t("pricing")}
          </Link>
          <Link href="/partners" className="hover:text-foreground">
            {t("partners")}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {/* Below `md` these live inside the MobileNav drawer instead. */}
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Show when="signed-in">
            <UserButton userProfileUrl="/settings/accounts" />
          </Show>
          <Show when="signed-out">
            <Button
              size="sm"
              variant="ghost"
              className="hidden md:inline-flex"
              nativeButton={false}
              render={<Link href="/sign-in">{t("login")}</Link>}
            />
          </Show>
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:opacity-90"
            nativeButton={false}
            render={<Link href="/#lead-form">{t("cta")}</Link>}
          />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
