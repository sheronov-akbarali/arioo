import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./language-switcher";
import { ThemeToggle } from "./theme-toggle";

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
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            size="sm"
            className="bg-brand text-brand-foreground hover:opacity-90"
            nativeButton={false}
            render={<Link href="/#lead-form">{t("cta")}</Link>}
          />
        </div>
      </div>
    </header>
  );
}
