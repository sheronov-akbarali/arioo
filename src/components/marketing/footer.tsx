import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Send } from "lucide-react";

const LEGAL_DOCS = ["offer", "privacy", "terms", "cookies", "consent"] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tLegal = useTranslations("legal");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 text-sm sm:grid-cols-3">
        <div>
          <p className="font-semibold text-foreground">Arioo</p>
          <p className="mt-2 max-w-xs text-muted-foreground">{t("tagline")}</p>
          <a
            href="https://t.me/arioo_support"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Send className="size-3.5" />
            {t("telegramCta")}
          </a>
        </div>
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("menuTitle")}
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
                {tNav("pricing")}
              </Link>
            </li>
            <li>
              <Link href="/partners" className="text-muted-foreground hover:text-foreground">
                {tNav("partners")}
              </Link>
            </li>
            <li>
              <Link href="/#how-it-works" className="text-muted-foreground hover:text-foreground">
                {tNav("howItWorks")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("legalTitle")}
          </p>
          <ul className="flex flex-col gap-2">
            {LEGAL_DOCS.map((doc) => (
              <li key={doc}>
                <Link href={`/legal/${doc}`} className="text-muted-foreground hover:text-foreground">
                  {tLegal(`${doc}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-muted-foreground">
          <p>{t("copyright")}</p>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-brand" />
            {t("status")}
          </span>
        </div>
      </div>
    </footer>
  );
}
